"""Live web research through a real Playwright Chromium session."""

from __future__ import annotations

import ipaddress
import re
import subprocess
import tempfile
from html import unescape
from html.parser import HTMLParser
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.parse import parse_qs, quote_plus, urlparse

from app.core.config import Settings, get_settings


class BrowserResearchError(RuntimeError):
    pass


@dataclass(frozen=True)
class LiveSource:
    title: str
    url: str
    excerpt: str
    image_url: str | None = None


ObservationCallback = Callable[[str, str, str | None, str | None, bytes | None, str], None]


class _SearchResultParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.results: list[tuple[str, str]] = []
        self._href = ""
        self._text: list[str] = []
        self._heading_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "h2":
            self._heading_depth += 1
        classes = (values.get("class") or "").split()
        is_search_link = bool({"result__a", "result-link"} & set(classes))
        if tag == "a" and values.get("href") and (is_search_link or self._heading_depth > 0):
            self._href = values.get("href") or ""
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._href:
            self.results.append((" ".join(self._text).strip(), self._href))
            self._href = ""
            self._text = []
        if tag == "h2" and self._heading_depth:
            self._heading_depth -= 1


class BrowserResearchService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def search_and_retrieve(
        self,
        query: str,
        *,
        limit: int,
        observe: ObservationCallback,
    ) -> list[LiveSource]:
        try:
            from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
            from playwright.sync_api import sync_playwright
        except ImportError:
            return self._search_with_installed_chrome(query, limit=limit, observe=observe)

        timeout_ms = int(self.settings.browser_timeout_seconds * 1000)
        search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        observe("launch", "Launching a private Chromium research session.", None, None, None, "running")
        try:
            with sync_playwright() as playwright:
                try:
                    browser = playwright.chromium.launch(
                        headless=self.settings.browser_headless,
                        executable_path=self._browser_executable_path(),
                    )
                except Exception as exc:
                    raise BrowserResearchError(
                        "Chromium is not installed for Playwright. Run: python -m playwright install chromium"
                    ) from exc
                context = browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "Chrome/131.0 Safari/537.36"
                    ),
                    viewport={"width": 1280, "height": 800},
                )
                page = context.new_page()
                observe("search", f"Searching the live web for: {query}", search_url, "DuckDuckGo", None, "running")
                page.goto(search_url, wait_until="domcontentloaded", timeout=timeout_ms)
                page.wait_for_selector(".result", timeout=timeout_ms)
                search_image = page.screenshot(type="png", full_page=False)
                observe("search", "Live search results loaded.", page.url, page.title(), search_image, "succeeded")

                candidates: list[tuple[str, str, str]] = []
                for result in page.locator(".result").all()[: max(limit * 2, 8)]:
                    link = result.locator("a.result__a").first
                    href = link.get_attribute("href") or ""
                    title = (link.inner_text() or "").strip()
                    snippet = (result.locator(".result__snippet").first.inner_text() or "").strip()
                    clean_url = self._clean_search_url(href)
                    if title and clean_url and self._is_public_http_url(clean_url):
                        candidates.append((title, clean_url, snippet))
                    if len(candidates) >= limit:
                        break

                sources: list[LiveSource] = []
                for title, url, snippet in candidates:
                    observe("open", f"Opening {urlparse(url).netloc}", url, title, None, "running")
                    source_page = context.new_page()
                    try:
                        source_page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                        body = source_page.locator("body").inner_text(timeout=timeout_ms)
                        body = " ".join(body.split())[:5000]
                        if len(body) < 120:
                            body = snippet
                        if len(body) < 80:
                            continue
                        final_url = source_page.url
                        if not self._is_public_http_url(final_url):
                            continue
                        final_title = (source_page.title() or title).strip()[:300]
                        image = source_page.screenshot(type="png", full_page=False)
                        sources.append(LiveSource(title=final_title, url=final_url, excerpt=body))
                        observe(
                            "extract",
                            f"Captured source {len(sources)} of {limit}.",
                            final_url,
                            final_title,
                            image,
                            "succeeded",
                        )
                    except PlaywrightTimeoutError:
                        observe("error", "Source timed out and was skipped.", url, title, None, "failed")
                    except Exception:
                        observe("error", "Source could not be read and was skipped.", url, title, None, "failed")
                    finally:
                        source_page.close()
                context.close()
                browser.close()
        except BrowserResearchError:
            raise
        except Exception as exc:
            raise BrowserResearchError(f"Live browser research failed ({type(exc).__name__}).") from exc

        if not sources:
            raise BrowserResearchError("No readable live sources were returned for this query.")
        observe("complete", f"Browser research completed with {len(sources)} real sources.", None, None, None, "succeeded")
        return sources

    def _search_with_installed_chrome(
        self,
        query: str,
        *,
        limit: int,
        observe: ObservationCallback,
    ) -> list[LiveSource]:
        executable = self._browser_executable_path()
        if not executable:
            raise BrowserResearchError(
                "Neither Playwright nor an installed Chrome/Edge browser is available. Run `npm run setup:api`."
            )
        observe("launch", "Launching installed Chrome for live research.", None, None, None, "running")
        with tempfile.TemporaryDirectory(prefix="research-browser-") as profile:
            candidates: list[tuple[str, str]] = []
            search_targets = (
                ("DuckDuckGo", f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"),
                ("Bing", f"https://www.bing.com/search?q={quote_plus(query)}"),
            )
            for engine, search_url in search_targets:
                observe("search", f"Searching {engine} for live sources.", search_url, engine, None, "running")
                try:
                    search_html = self._dump_dom(executable, search_url, profile)
                except BrowserResearchError:
                    observe("error", f"{engine} search could not be loaded.", search_url, engine, None, "failed")
                    continue
                parser = _SearchResultParser()
                parser.feed(search_html)
                for title, href in parser.results:
                    url = self._clean_search_url(unescape(href), search_url)
                    if (
                        title
                        and self._is_public_http_url(url)
                        and not self._is_search_engine_url(url)
                        and all(existing_url != url for _, existing_url in candidates)
                    ):
                        candidates.append((unescape(title), url))
                    if len(candidates) >= limit:
                        break
                if candidates:
                    search_image = self._capture_cli_screenshot(executable, search_url, profile)
                    observe(
                        "search",
                        f"{engine} returned {len(candidates)} live result links.",
                        search_url,
                        engine,
                        search_image,
                        "succeeded",
                    )
                    break
                observe(
                    "error",
                    f"{engine} returned no extractable result links; trying another engine.",
                    search_url,
                    engine,
                    None,
                    "failed",
                )

            sources: list[LiveSource] = []
            for title, url in candidates:
                observe("open", f"Opening {urlparse(url).netloc}", url, title, None, "running")
                try:
                    document = self._dump_dom(executable, url, profile)
                    page_title = self._document_title(document) or title
                    excerpt = self._document_text(document)[:5000]
                    if len(excerpt) < 80:
                        continue
                    image = self._capture_cli_screenshot(executable, url, profile)
                    sources.append(LiveSource(title=page_title[:300], url=url, excerpt=excerpt))
                    observe(
                        "extract",
                        f"Captured source {len(sources)} of {limit}.",
                        url,
                        page_title[:300],
                        image,
                        "succeeded",
                    )
                except BrowserResearchError:
                    observe("error", "Source could not be read and was skipped.", url, title, None, "failed")

        if not sources:
            raise BrowserResearchError("No readable live sources were returned for this query.")
        observe("complete", f"Browser research completed with {len(sources)} real sources.", None, None, None, "succeeded")
        return sources

    def _dump_dom(self, executable: str, url: str, profile: str) -> str:
        result = subprocess.run(
            [
                executable,
                "--headless=new",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-background-networking",
                f"--user-data-dir={profile}",
                "--dump-dom",
                url,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=self.settings.browser_timeout_seconds,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if result.returncode != 0 or len(result.stdout) < 80:
            raise BrowserResearchError("Installed Chrome could not load the requested page.")
        return result.stdout

    def _capture_cli_screenshot(self, executable: str, url: str, profile: str) -> bytes | None:
        with tempfile.TemporaryDirectory(prefix="research-shot-") as directory:
            path = Path(directory) / "page.png"
            try:
                subprocess.run(
                    [
                        executable,
                        "--headless=new",
                        "--disable-gpu",
                        "--disable-extensions",
                        f"--user-data-dir={profile}-shot",
                        "--window-size=1280,800",
                        f"--screenshot={path}",
                        url,
                    ],
                    capture_output=True,
                    timeout=self.settings.browser_timeout_seconds,
                    check=False,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
                return path.read_bytes() if path.is_file() else None
            except (OSError, subprocess.SubprocessError):
                return None

    @staticmethod
    def _document_title(document: str) -> str:
        match = re.search(r"<title[^>]*>(.*?)</title>", document, flags=re.IGNORECASE | re.DOTALL)
        return " ".join(unescape(match.group(1)).split()) if match else ""

    @staticmethod
    def _document_text(document: str) -> str:
        without_scripts = re.sub(
            r"<(script|style|noscript|svg)[^>]*>.*?</\1>",
            " ",
            document,
            flags=re.IGNORECASE | re.DOTALL,
        )
        return " ".join(unescape(re.sub(r"<[^>]+>", " ", without_scripts)).split())

    def save_screenshot(self, job_id: str, observation_id: str, content: bytes) -> str:
        directory = Path(self.settings.browser_artifact_dir).resolve() / job_id
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"{observation_id}.png"
        path.write_bytes(content)
        return f"/v1/jobs/{job_id}/automation/{observation_id}/screenshot"

    def screenshot_path(self, job_id: str, observation_id: str) -> Path:
        root = Path(self.settings.browser_artifact_dir).resolve()
        path = (root / job_id / f"{observation_id}.png").resolve()
        if root not in path.parents:
            raise BrowserResearchError("Invalid screenshot path.")
        return path

    def _browser_executable_path(self) -> str | None:
        if self.settings.browser_executable_path:
            path = Path(self.settings.browser_executable_path)
            if not path.is_file():
                raise BrowserResearchError(f"Configured browser was not found: {path}")
            return str(path)
        candidates = (
            Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"),
            Path("C:/Program Files/Microsoft/Edge/Application/msedge.exe"),
            Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
        )
        return next((str(path) for path in candidates if path.is_file()), None)

    @staticmethod
    def _clean_search_url(value: str, search_url: str = "https://duckduckgo.com") -> str:
        from urllib.parse import urljoin

        if value.startswith("//"):
            value = "https:" + value
        elif value.startswith("/"):
            value = urljoin(search_url, value)
        parsed = urlparse(value)
        if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
            return parse_qs(parsed.query).get("uddg", [""])[0]
        return value

    @staticmethod
    def _is_search_engine_url(value: str) -> bool:
        hostname = (urlparse(value).hostname or "").lower()
        return any(
            hostname == domain or hostname.endswith(f".{domain}")
            for domain in ("duckduckgo.com", "bing.com", "microsoft.com")
        )

    @staticmethod
    def _is_public_http_url(value: str) -> bool:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return False
        hostname = parsed.hostname.lower()
        if hostname in {"localhost", "localhost.localdomain"} or hostname.endswith(".local"):
            return False
        try:
            address = ipaddress.ip_address(hostname)
            return not (address.is_private or address.is_loopback or address.is_link_local or address.is_reserved)
        except ValueError:
            return True


browser_research_service = BrowserResearchService()
