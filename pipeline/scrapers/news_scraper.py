import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import feedparser
import httpx
from pipeline.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)

DEFAULT_RSS_FEEDS = [
    "https://feeds.feedburner.com/TechCrunch",
    "https://www.wired.com/feed/rss",
]


@dataclass
class RawArticle:
    titulo: str
    url: str
    fuente: str
    contenido: str
    fecha_pub: Optional[datetime] = None
    pais: str = "global"


class NewsScraper(BaseScraper):
    def __init__(self, newsapi_key: Optional[str], rss_feeds: list[str] = None):
        super().__init__(rate_per_sec=2.0)
        self._newsapi_key = newsapi_key
        self._rss_feeds = rss_feeds if rss_feeds is not None else DEFAULT_RSS_FEEDS

    def scrape(self) -> list[RawArticle]:
        articles = self.scrape_rss()
        if self._newsapi_key:
            articles += self.scrape_newsapi(query="AI employment education jobs layoffs", days_back=3)
        return self.deduplicar(articles)

    def scrape_rss(self) -> list[RawArticle]:
        results = []
        for feed_url in self._rss_feeds:
            self._wait()
            try:
                with httpx.Client(timeout=15) as client:
                    resp = client.get(feed_url)
                    resp.raise_for_status()
                    feed = feedparser.parse(resp.text)
                host = feed_url.split("/")[2].replace("www.", "")
                # For feed aggregators (feedburner, feeds.*), use the path segment as the label
                if host.startswith("feeds.") or "feedburner" in host:
                    path_part = feed_url.split("/")[-1].lower()
                    domain = path_part if path_part else host.split(".")[1]
                else:
                    domain = host.split(".")[0]
                for entry in feed.entries:
                    results.append(RawArticle(
                        titulo=entry.get("title", "").strip(),
                        url=entry.get("link", ""),
                        fuente=f"rss_{domain}",
                        contenido=entry.get("summary", entry.get("description", "")),
                        fecha_pub=_parse_date(entry.get("published")),
                    ))
            except Exception as e:
                logger.warning("RSS error %s: %s", feed_url, e)
        return results

    def scrape_newsapi(self, query: str, days_back: int = 3) -> list[RawArticle]:
        if not self._newsapi_key:
            return []
        self._wait()
        since = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        params = {
            "q": query, "from": since, "language": "es,en",
            "sortBy": "publishedAt", "apiKey": self._newsapi_key,
            "pageSize": 100,
        }
        try:
            with httpx.Client(timeout=20) as client:
                resp = client.get("https://newsapi.org/v2/everything", params=params)
                resp.raise_for_status()
                data = resp.json()
            return [
                RawArticle(
                    titulo=a["title"] or "",
                    url=a["url"],
                    fuente="newsapi",
                    contenido=a.get("description") or "",
                    fecha_pub=_parse_date(a.get("publishedAt")),
                )
                for a in data.get("articles", [])
                if a.get("url") and a.get("title")
            ]
        except Exception as e:
            logger.error("NewsAPI error: %s", e)
            return []

    @staticmethod
    def deduplicar(articles: list[RawArticle]) -> list[RawArticle]:
        seen: set[str] = set()
        result = []
        for a in articles:
            if a.url not in seen:
                seen.add(a.url)
                result.append(a)
        return result


def _parse_date(val) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    import email.utils
    try:
        return datetime(*email.utils.parsedate(val)[:6])
    except Exception:
        try:
            return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        except Exception:
            return None
