# pipeline/radar/sources/grok_source.py
"""Fuente de noticias: Grok API (xAI) con acceso real-time a X + web."""
import json
import os
import structlog
from dataclasses import dataclass
from typing import Optional
from openai import OpenAI

logger = structlog.get_logger()

_GROK_BASE_URL = "https://api.x.ai/v1"
_GROK_MODEL = "grok-3"


@dataclass
class GrokArticle:
    titulo: str
    url: str
    fecha: str
    fuente: str
    resumen: str


_QUERIES = {
    "despidos": [
        "AI layoffs 2025 workers replaced automation",
        "artificial intelligence job cuts companies 2025",
        "despidos inteligencia artificial empresas 2025",
        "AI replacing workers site:reuters.com OR site:bloomberg.com OR site:techcrunch.com",
    ],
    "empleos": [
        "AI jobs hiring 2025 new positions created",
        "companies hiring AI engineers prompt engineers 2025",
        "empleos nuevos inteligencia artificial empresas 2025",
    ],
}


def fetch_grok_news(tipo: str, api_key: Optional[str] = None, max_per_query: int = 10) -> list[GrokArticle]:
    """Busca noticias en Grok API. tipo: 'despidos' | 'empleos'."""
    key = api_key or os.getenv("GROK_API_KEY", "")
    if not key:
        logger.warning("grok_no_api_key")
        return []

    client = OpenAI(api_key=key, base_url=_GROK_BASE_URL)
    queries = _QUERIES.get(tipo, _QUERIES["despidos"])
    all_articles = []
    seen_urls: set[str] = set()

    for query in queries[:2]:
        try:
            resp = client.chat.completions.create(
                model=_GROK_MODEL,
                messages=[{
                    "role": "user",
                    "content": f"""Busca las últimas noticias sobre: {query}

Devuelve SOLO un JSON array con los {max_per_query} artículos más relevantes del último mes.
Formato de cada artículo:
{{"titulo": "...", "url": "...", "fecha": "YYYY-MM-DD", "fuente": "nombre del medio", "resumen": "2-3 oraciones"}}

Si no hay noticias relevantes, devuelve [].
Responde SOLO con el JSON array."""
                }],
            )
            raw = resp.choices[0].message.content.strip()
            articles_data = json.loads(raw)
            for a in articles_data:
                if a.get("url") and a["url"] not in seen_urls:
                    seen_urls.add(a["url"])
                    all_articles.append(GrokArticle(
                        titulo=a.get("titulo", ""),
                        url=a["url"],
                        fecha=a.get("fecha", ""),
                        fuente=a.get("fuente", "Grok"),
                        resumen=a.get("resumen", ""),
                    ))
        except Exception as e:
            logger.error("grok_fetch_error", query=query, error=str(e))
            continue

    logger.info("grok_fetch_complete", tipo=tipo, count=len(all_articles))
    return all_articles
