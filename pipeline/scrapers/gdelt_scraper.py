# pipeline/scrapers/gdelt_scraper.py
import logging
from datetime import datetime
from typing import Optional
import httpx
from pipeline.scrapers.base_scraper import BaseScraper
from pipeline.scrapers.news_scraper import RawArticle

logger = logging.getLogger(__name__)

GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
MAX_RECORDS = 250

DEFAULT_QUERIES = [
    "inteligencia artificial empleo",
    "AI jobs education",
    "automatización trabajo",
    "machine learning workforce",
    "IA educación México",
    "artificial intelligence employment",
]


class GdeltScraper(BaseScraper):
    def __init__(self, queries: list[str] = None):
        super().__init__(rate_per_sec=1.0)
        self._queries = queries or DEFAULT_QUERIES

    def scrape(self) -> list[RawArticle]:
        return self.fetch()

    def fetch(self) -> list[RawArticle]:
        seen_urls: set[str] = set()
        results: list[RawArticle] = []
        for query in self._queries:
            self._wait()
            for a in self._fetch_query(query):
                if a.url not in seen_urls:
                    seen_urls.add(a.url)
                    results.append(a)
        return results

    def _fetch_query(self, query: str) -> list[RawArticle]:
        params = {
            "query": query,
            "mode": "ArtList",
            "maxrecords": str(MAX_RECORDS),
            "format": "json",
        }
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.get(GDELT_DOC_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
            return [self._parse(a) for a in (data.get("articles") or []) if a.get("url")]
        except Exception as e:
            logger.error("GDELT query '%s' failed: %s", query, e)
            return []

    def _parse(self, a: dict) -> RawArticle:
        fecha_pub: Optional[datetime] = None
        raw_date = a.get("seendate", "")
        if raw_date:
            try:
                fecha_pub = datetime.strptime(raw_date, "%Y%m%dT%H%M%SZ")
            except ValueError:
                pass
        return RawArticle(
            titulo=a.get("title", ""),
            url=a["url"],
            fuente="gdelt",
            contenido="",
            fecha_pub=fecha_pub,
            pais=a.get("sourcecountry", "global"),
        )


if __name__ == "__main__":
    import os
    from pipeline.db import get_session
    from pipeline.ingest_gdelt import run_gdelt_pipeline

    api_key_claude = os.getenv("ANTHROPIC_API_KEY", "")
    api_key_voyage = os.getenv("VOYAGE_API_KEY", "")

    with get_session() as session:
        result = run_gdelt_pipeline(session, api_key_claude, api_key_voyage)

    print(f"GDELT Ingest complete:")
    print(f"  fetched:    {result.fetched}")
    print(f"  stored:     {result.stored}")
    print(f"  classified: {result.classified}")
    print(f"  embedded:   {result.embedded}")
