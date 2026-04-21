# tests/scrapers/test_gdelt_scraper.py
import pytest
import respx
import httpx
from pipeline.scrapers.gdelt_scraper import GdeltScraper, DEFAULT_QUERIES

SAMPLE_RESPONSE = {
    "articles": [
        {
            "title": "IA elimina empleos en México",
            "url": "https://example.com/art1",
            "seendate": "20240415T120000Z",
            "sourcecountry": "Mexico",
        },
        {
            "title": "AI jobs growing in US",
            "url": "https://example.com/art2",
            "seendate": "20240415T130000Z",
            "sourcecountry": "United States",
        },
    ]
}


@respx.mock
def test_fetch_retorna_articulos():
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json=SAMPLE_RESPONSE)
    )
    scraper = GdeltScraper(queries=["inteligencia artificial empleo"])
    articles = scraper.fetch()
    assert len(articles) == 2
    assert articles[0].fuente == "gdelt"
    assert articles[0].titulo == "IA elimina empleos en México"
    assert articles[0].pais == "Mexico"


@respx.mock
def test_fetch_deduplica_por_url():
    same_url_response = {
        "articles": [
            {"title": "Artículo duplicado", "url": "https://example.com/dup", "seendate": "20240415T120000Z"}
        ]
    }
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json=same_url_response)
    )
    scraper = GdeltScraper(queries=["query uno", "query dos"])
    articles = scraper.fetch()
    assert len(articles) == 1


@respx.mock
def test_fetch_maneja_respuesta_vacia():
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json={"articles": []})
    )
    scraper = GdeltScraper(queries=["test query"])
    articles = scraper.fetch()
    assert articles == []


@respx.mock
def test_fetch_maneja_error_http():
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(500)
    )
    scraper = GdeltScraper(queries=["test query"])
    articles = scraper.fetch()
    assert articles == []
