# pipeline/radar/sources/newsapi_source.py
"""Fuente de noticias: NewsAPI para cobertura global estructurada."""
import os
import httpx
import structlog
from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timedelta

logger = structlog.get_logger()

_NEWSAPI_BASE = "https://newsapi.org/v2/everything"

_DESPIDO_QUERIES = [
    '"AI layoffs" OR "artificial intelligence jobs cut" OR "automation replaces workers"',
    '"despidos IA" OR "automatización empleos" OR "inteligencia artificial desplaza"',
]
_EMPLEO_QUERIES = [
    '"AI engineer" hiring OR "prompt engineer" jobs OR "LLM jobs" 2025',
    '"new AI jobs" OR "AI creating jobs" OR "hiring AI roles"',
]


@dataclass
class NewsAPIArticle:
    titulo: str
    url: str
    fecha: str
    fuente: str
    contenido: str


def fetch_newsapi_articles(tipo: str, api_key: Optional[str] = None, days_back: int = 3) -> list[NewsAPIArticle]:
    """Obtiene artículos de NewsAPI. tipo: 'despidos' | 'empleos'."""
    key = api_key or os.getenv("NEWSAPI_KEY", "")
    if not key:
        logger.warning("newsapi_no_key")
        return []

    queries = _DESPIDO_QUERIES if tipo == "despidos" else _EMPLEO_QUERIES
    from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    articles = []
    seen_urls: set[str] = set()

    for q in queries[:1]:
        try:
            resp = httpx.get(_NEWSAPI_BASE, params={
                "q": q,
                "from": from_date,
                "sortBy": "relevancy",
                "language": "en",
                "pageSize": 20,
                "apiKey": key,
            }, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            for a in data.get("articles", []):
                if a.get("url") and a["url"] not in seen_urls:
                    seen_urls.add(a["url"])
                    articles.append(NewsAPIArticle(
                        titulo=a.get("title", ""),
                        url=a["url"],
                        fecha=(a.get("publishedAt", "") or "")[:10],
                        fuente=a.get("source", {}).get("name", "NewsAPI"),
                        contenido=a.get("content", a.get("description", "")),
                    ))
        except Exception as e:
            logger.error("newsapi_fetch_error", tipo=tipo, error=str(e))

    logger.info("newsapi_fetch_complete", tipo=tipo, count=len(articles))
    return articles
