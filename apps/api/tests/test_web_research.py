import httpx

from app.core.config import Settings
from app.services.web_research import WebResearchService


def test_multi_site_research_parses_bing_and_duckduckgo_results() -> None:
    def web(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "bing.com/search" in url:
            return httpx.Response(
                200,
                headers={"content-type": "application/rss+xml"},
                text="""<?xml version="1.0"?><rss><channel>
                <item><title>Retailer laptop offer</title><link>https://shop.example/laptop-a</link>
                <description>Current Laptop A offer with price and specifications from the retailer.</description></item>
                <item><title>Official Laptop A specifications</title><link>https://maker.example/laptop-a</link>
                <description>Official processor, memory, display, and battery specifications.</description></item>
                </channel></rss>""",
            )
        if "duckduckgo.com/html" in url:
            return httpx.Response(200, headers={"content-type": "text/html"}, text="<html><body>No extra results</body></html>")
        if "shop.example" in url:
            return httpx.Response(
                200,
                headers={"content-type": "text/html"},
                text="<html><head><title>Laptop A — current offer</title><meta name='description' content='Laptop A is currently listed for 49,999 rupees.'></head><body><main>Laptop A includes 16 GB RAM, a 512 GB SSD, and a 14 inch display. Availability is shown by the retailer.</main></body></html>",
            )
        if "maker.example" in url:
            return httpx.Response(
                200,
                headers={"content-type": "text/html"},
                text="<html><head><title>Laptop A specifications</title></head><body><article>The manufacturer lists the processor, 16 GB memory, 512 GB storage, ports, dimensions, warranty, and display specifications for Laptop A.</article></body></html>",
            )
        return httpx.Response(404)

    service = WebResearchService(
        Settings(storage_backend="memory", web_research_timeout_seconds=2),
        httpx.MockTransport(web),
    )
    observations: list[tuple] = []
    sources = service.search_and_retrieve(
        "laptops under 50000",
        limit=4,
        observe=lambda *args: observations.append(args),
    )

    assert len(sources) == 2
    assert {source.url for source in sources} == {
        "https://shop.example/laptop-a",
        "https://maker.example/laptop-a",
    }
    assert "49,999" in sources[0].excerpt
    assert any(item[0] == "complete" and "2 websites" in item[1] for item in observations)
