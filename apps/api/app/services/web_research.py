"""Multi-provider web search and readable-page extraction without browser automation."""

from __future__ import annotations

import ipaddress
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse

import httpx

from app.core.config import Settings, get_settings
from app.services.browser_research import BrowserResearchError, LiveSource, ObservationCallback
from app.services.deepseek import DeepSeekClient, DeepSeekError, deepseek_client


@dataclass(frozen=True)
class SearchCandidate:
    title: str
    url: str
    snippet: str = ""
    raw_content: str = ""
    image_url: str = ""


class SearchLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.results: list[SearchCandidate] = []
        self._href = ""
        self._title: list[str] = []
        self._snippet: list[str] = []
        self._capture_snippet = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        classes = set((values.get("class") or "").split())
        if tag == "a" and values.get("href") and ({"result__a", "result-link"} & classes):
            self._href = values["href"] or ""
            self._title = []
        if tag in {"a", "div", "span"} and ({"result__snippet", "result-snippet"} & classes):
            self._capture_snippet = True
            self._snippet = []

    def handle_data(self, data: str) -> None:
        if self._href:
            self._title.append(data)
        if self._capture_snippet:
            self._snippet.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._href:
            self.results.append(SearchCandidate(_clean_text(" ".join(self._title)), self._href))
            self._href = ""
            self._title = []
        if tag in {"a", "div", "span"} and self._capture_snippet:
            snippet = _clean_text(" ".join(self._snippet))
            if snippet and self.results:
                latest = self.results[-1]
                self.results[-1] = SearchCandidate(latest.title, latest.url, snippet)
            self._capture_snippet = False
            self._snippet = []


class ReadablePageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title: list[str] = []
        self.description = ""
        self.image_url = ""
        self.text: list[str] = []
        self._title_depth = 0
        self._ignored_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "title":
            self._title_depth += 1
        if tag in {"script", "style", "noscript", "svg", "nav", "footer", "form"}:
            self._ignored_depth += 1
        if tag == "meta" and not self.description:
            key = (values.get("name") or values.get("property") or "").lower()
            if key in {"description", "og:description", "twitter:description"}:
                self.description = _clean_text(values.get("content") or "")
        if tag == "meta" and not self.image_url:
            key = (values.get("name") or values.get("property") or "").lower()
            if key in {"og:image", "twitter:image", "twitter:image:src"}:
                self.image_url = (values.get("content") or "").strip()

    def handle_data(self, data: str) -> None:
        if self._title_depth:
            self.title.append(data)
        if not self._ignored_depth:
            value = _clean_text(data)
            if len(value) > 1:
                self.text.append(value)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._title_depth:
            self._title_depth -= 1
        if tag in {"script", "style", "noscript", "svg", "nav", "footer", "form"} and self._ignored_depth:
            self._ignored_depth -= 1


class WebResearchService:
    def __init__(self, settings: Settings | None = None, transport: httpx.BaseTransport | None = None, deepseek: DeepSeekClient | None = None) -> None:
        self.settings = settings or get_settings()
        self._transport = transport
        self.deepseek = deepseek or deepseek_client
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.8",
        }

    def search_and_retrieve(
        self,
        query: str,
        *,
        limit: int,
        observe: ObservationCallback,
    ) -> list[LiveSource]:
        observe("launch", "Starting multi-source web research.", None, None, None, "running")
        candidates: list[SearchCandidate] = []
        errors: list[str] = []
        search_queries = self._plan_search_queries(query)
        providers = [
            ("Brave", self._search_brave),
            ("Tavily", self._search_tavily),
            ("Bing", self._search_bing_rss),
            ("DuckDuckGo", self._search_duckduckgo),
        ]
        for query_index, planned_query in enumerate(search_queries):
            for name, search in providers:
                if query_index > 0 and name not in {"Tavily", "Brave"}:
                    continue
                observe("search", f"Searching {name}: {planned_query}", None, name, None, "running")
                try:
                    found = search(planned_query, max(limit, 6))
                    candidates.extend(found)
                    observe("search", f"{name} returned {len(found)} usable results.", None, name, None, "succeeded")
                except BrowserResearchError as exc:
                    errors.append(f"{name}: {exc}")
                    observe("error", f"{name} was unavailable; continuing with other sources.", None, name, None, "failed")

        candidates = self._rank_and_dedupe(candidates, limit=max(limit * 3, 12))
        if self.settings.tavily_api_key and candidates:
            candidates = self._extract_with_tavily(candidates[: max(limit * 2, 8)]) + candidates[max(limit * 2, 8):]
        if not candidates:
            detail = " ".join(errors[:2])
            raise BrowserResearchError(f"Search providers returned no usable links. {detail}".strip())

        sources: list[LiveSource] = []
        seen_domains: set[str] = set()
        for candidate in candidates:
            domain = (urlparse(candidate.url).hostname or "").lower().removeprefix("www.")
            if len(sources) >= limit:
                break
            observe("open", f"Reading {domain}.", candidate.url, candidate.title, None, "running")
            source = self._read_candidate(candidate)
            if not source:
                observe("error", f"{domain} could not be parsed; using other sources.", candidate.url, candidate.title, None, "failed")
                continue
            sources.append(source)
            seen_domains.add(domain)
            observe(
                "extract",
                f"Added source {len(sources)} from {domain}.",
                source.url,
                source.title,
                None,
                "succeeded",
            )

        if not sources:
            raise BrowserResearchError("Search results were found, but their pages and snippets contained no readable evidence.")
        observe(
            "complete",
            f"Research completed with {len(sources)} sources across {len(seen_domains)} websites.",
            None,
            None,
            None,
            "succeeded",
        )
        return sources

    def _search_brave(self, query: str, limit: int) -> list[SearchCandidate]:
        if not self.settings.brave_search_api_key:
            return []
        response = self._request(
            "GET",
            "https://api.search.brave.com/res/v1/web/search",
            params={"q": query, "count": min(limit, 20), "safesearch": "moderate"},
            headers={"X-Subscription-Token": self.settings.brave_search_api_key, "Accept": "application/json"},
        )
        try:
            payload = response.json()
            return [
                SearchCandidate(_clean_text(item.get("title", "")), item.get("url", ""), _clean_text(item.get("description", "")))
                for item in payload.get("web", {}).get("results", [])
                if item.get("url")
            ]
        except (ValueError, TypeError, AttributeError) as exc:
            raise BrowserResearchError("invalid search response") from exc

    def _search_tavily(self, query: str, limit: int) -> list[SearchCandidate]:
        if not self.settings.tavily_api_key:
            return []
        response = self._request(
            "POST",
            "https://api.tavily.com/search",
            json={
                "api_key": self.settings.tavily_api_key,
                "query": query,
                "search_depth": "advanced",
                "max_results": min(limit, 20),
                "include_raw_content": True,
                "include_images": True,
            },
            headers={"Accept": "application/json"},
        )
        try:
            payload = response.json()
            return [
                SearchCandidate(
                    _clean_text(item.get("title", "")),
                    item.get("url", ""),
                    _clean_text(item.get("content", "")),
                    _clean_text(item.get("raw_content", "")),
                    str(item.get("image_url") or item.get("image") or ""),
                )
                for item in payload.get("results", [])
                if item.get("url")
            ]
        except (ValueError, TypeError, AttributeError) as exc:
            raise BrowserResearchError("invalid search response") from exc

    def _search_bing_rss(self, query: str, limit: int) -> list[SearchCandidate]:
        response = self._request("GET", f"https://www.bing.com/search?format=rss&q={quote_plus(query)}")
        try:
            root = ET.fromstring(response.text)
            results = []
            for item in root.findall(".//item")[:limit]:
                title = _clean_text(item.findtext("title") or "")
                url = _clean_text(item.findtext("link") or "")
                snippet = _clean_text(re.sub(r"<[^>]+>", " ", item.findtext("description") or ""))
                if url:
                    results.append(SearchCandidate(title, url, snippet))
            return results
        except ET.ParseError as exc:
            raise BrowserResearchError("invalid RSS response") from exc

    def _search_duckduckgo(self, query: str, limit: int) -> list[SearchCandidate]:
        search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        response = self._request("GET", search_url)
        parser = SearchLinkParser()
        parser.feed(response.text)
        return [
            SearchCandidate(item.title, self._clean_result_url(item.url, search_url), item.snippet)
            for item in parser.results[:limit]
        ]

    def _read_candidate(self, candidate: SearchCandidate) -> LiveSource | None:
        if not self._is_public_http_url(candidate.url):
            return None
        if len(candidate.raw_content) >= 160 and candidate.image_url:
            return LiveSource(candidate.title[:300], candidate.url, candidate.raw_content[:6000], candidate.image_url)
        try:
            response = self._request("GET", candidate.url, max_redirects=3)
            content_type = response.headers.get("content-type", "")
            if "html" not in content_type and "text/" not in content_type:
                raise BrowserResearchError("non-readable content type")
            parser = ReadablePageParser()
            parser.feed(response.text[:2_000_000])
            title = _clean_text(" ".join(parser.title)) or candidate.title
            excerpt = _clean_text(" ".join([parser.description, *parser.text]))[:6000]
            image_url = urljoin(candidate.url, parser.image_url) if parser.image_url else candidate.image_url
        except BrowserResearchError:
            title, excerpt, image_url = candidate.title, candidate.raw_content or candidate.snippet, candidate.image_url
        if len(excerpt) < 80:
            return None
        return LiveSource(title=title[:300], url=candidate.url, excerpt=excerpt, image_url=image_url or None)

    def _plan_search_queries(self, query: str) -> list[str]:
        if not self.deepseek.is_configured:
            return [query]
        try:
            result = self.deepseek.complete_json(
                system_prompt=(
                    "Plan live product research searches. Return JSON with a queries array of 2 or 3 concise search "
                    "queries. Cover current retailer listings, official specifications, and independent comparison. "
                    "Keep every user constraint. Do not answer the question and do not invent URLs."
                ),
                user_prompt=query,
                temperature=0.1,
            )
            queries = result.get("queries")
            if isinstance(queries, list):
                cleaned = [str(item).strip() for item in queries if isinstance(item, str) and len(item.strip()) >= 8]
                if cleaned:
                    return list(dict.fromkeys(cleaned))[:3]
        except (DeepSeekError, ValueError):
            pass
        return [query]

    def _extract_with_tavily(self, candidates: list[SearchCandidate]) -> list[SearchCandidate]:
        try:
            response = self._request(
                "POST",
                "https://api.tavily.com/extract",
                json={
                    "api_key": self.settings.tavily_api_key,
                    "urls": [item.url for item in candidates],
                    "extract_depth": "advanced",
                    "include_images": True,
                },
                headers={"Accept": "application/json"},
            )
            payload = response.json()
            extracted = {str(item.get("url")): item for item in payload.get("results", []) if item.get("url")}
        except (BrowserResearchError, ValueError, TypeError, AttributeError):
            return candidates
        enriched: list[SearchCandidate] = []
        for candidate in candidates:
            item = extracted.get(candidate.url, {})
            images = item.get("images") if isinstance(item.get("images"), list) else []
            enriched.append(SearchCandidate(
                candidate.title,
                candidate.url,
                candidate.snippet,
                _clean_text(item.get("raw_content") or candidate.raw_content),
                str(images[0] if images else candidate.image_url),
            ))
        return enriched

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict | None = None,
        json: dict | None = None,
        headers: dict | None = None,
        max_redirects: int = 0,
    ) -> httpx.Response:
        current = url
        for redirect in range(max_redirects + 1):
            if not self._is_public_http_url(current):
                raise BrowserResearchError("unsafe result URL")
            try:
                with httpx.Client(
                    timeout=self.settings.web_research_timeout_seconds,
                    transport=self._transport,
                    follow_redirects=False,
                    headers={**self._headers, **(headers or {})},
                ) as client:
                    response = client.request(method, current, params=params if redirect == 0 else None, json=json if redirect == 0 else None)
            except httpx.HTTPError as exc:
                raise BrowserResearchError(f"request failed ({type(exc).__name__})") from exc
            if response.is_redirect and redirect < max_redirects:
                current = urljoin(current, response.headers.get("location", ""))
                continue
            if response.status_code >= 400:
                raise BrowserResearchError(f"HTTP {response.status_code}")
            if len(response.content) > self.settings.web_research_max_response_bytes:
                raise BrowserResearchError("response was too large")
            return response
        raise BrowserResearchError("too many redirects")

    def _rank_and_dedupe(self, candidates: list[SearchCandidate], *, limit: int) -> list[SearchCandidate]:
        unique: list[SearchCandidate] = []
        seen_urls: set[str] = set()
        domain_counts: dict[str, int] = {}
        for item in candidates:
            url = self._clean_result_url(item.url)
            if not item.title or not self._is_public_http_url(url) or self._is_search_engine_url(url):
                continue
            normalized = url.split("#", 1)[0].rstrip("/")
            if normalized in seen_urls:
                continue
            domain = (urlparse(url).hostname or "").lower().removeprefix("www.")
            if domain_counts.get(domain, 0) >= 3:
                continue
            seen_urls.add(normalized)
            domain_counts[domain] = domain_counts.get(domain, 0) + 1
            unique.append(SearchCandidate(item.title, url, item.snippet, item.raw_content, item.image_url))
            if len(unique) >= limit:
                break
        return unique

    @staticmethod
    def _clean_result_url(value: str, base_url: str = "https://duckduckgo.com") -> str:
        value = unescape(value.strip())
        value = urljoin(base_url, value)
        parsed = urlparse(value)
        if "duckduckgo.com" in (parsed.hostname or "") and parsed.path.startswith("/l/"):
            return parse_qs(parsed.query).get("uddg", [""])[0]
        return value

    @staticmethod
    def _is_search_engine_url(value: str) -> bool:
        hostname = (urlparse(value).hostname or "").lower()
        return any(hostname == domain or hostname.endswith(f".{domain}") for domain in ("bing.com", "duckduckgo.com"))

    @staticmethod
    def _is_public_http_url(value: str) -> bool:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
            return False
        hostname = parsed.hostname.lower()
        if hostname in {"localhost", "localhost.localdomain"} or hostname.endswith(".local"):
            return False
        try:
            address = ipaddress.ip_address(hostname)
            return not (address.is_private or address.is_loopback or address.is_link_local or address.is_reserved)
        except ValueError:
            return True


def _clean_text(value: str) -> str:
    return " ".join(unescape(value).split())


web_research_service = WebResearchService()
