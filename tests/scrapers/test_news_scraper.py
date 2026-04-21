import pytest
import respx
import httpx
from pathlib import Path
from pipeline.scrapers.news_scraper import NewsScraper, RawArticle

RSS_FIXTURE = (Path(__file__).parent / "fixtures" / "sample_rss.xml").read_text()

NEWSAPI_FIXTURE = {
    "status": "ok",
    "totalResults": 1,
    "articles": [{
        "title": "Meta cuts 2000 jobs due to AI",
        "url": "https://newsapi.org/test/meta-cuts",
        "publishedAt": "2026-04-21T12:00:00Z",
        "description": "Meta announces layoffs driven by AI automation.",
        "source": {"name": "Reuters"}
    }]
}

@respx.mock
def test_scrape_rss_returns_articles():
    respx.get("https://feeds.feedburner.com/TechCrunch").mock(
        return_value=httpx.Response(200, text=RSS_FIXTURE, headers={"content-type": "application/xml"})
    )
    scraper = NewsScraper(newsapi_key=None, rss_feeds=["https://feeds.feedburner.com/TechCrunch"])
    articles = scraper.scrape_rss()
    assert len(articles) == 2
    assert all(isinstance(a, RawArticle) for a in articles)
    assert articles[0].titulo == "AI startup lays off 3,000 workers"
    assert articles[0].fuente == "rss_techcrunch"

@respx.mock
def test_scrape_newsapi_returns_articles():
    respx.get("https://newsapi.org/v2/everything").mock(
        return_value=httpx.Response(200, json=NEWSAPI_FIXTURE)
    )
    scraper = NewsScraper(newsapi_key="test-key", rss_feeds=[])
    articles = scraper.scrape_newsapi(query="AI layoffs", days_back=7)
    assert len(articles) == 1
    assert articles[0].titulo == "Meta cuts 2000 jobs due to AI"
    assert articles[0].fuente == "newsapi"

def test_deduplica_urls():
    scraper = NewsScraper(newsapi_key=None, rss_feeds=[])
    a1 = RawArticle(titulo="Test", url="https://t.co/1", fuente="rss", contenido="c")
    a2 = RawArticle(titulo="Test dup", url="https://t.co/1", fuente="rss", contenido="c2")
    deduped = scraper.deduplicar([a1, a2])
    assert len(deduped) == 1
