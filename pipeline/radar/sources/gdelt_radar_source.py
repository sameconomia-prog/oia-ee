# pipeline/radar/sources/gdelt_radar_source.py
"""Fuente de noticias gratuita: GDELT — sin API key requerida."""
import structlog
from dataclasses import dataclass
from pipeline.scrapers.gdelt_scraper import GdeltScraper

logger = structlog.get_logger()

_QUERIES = {
    "despidos": [
        "AI layoffs workers replaced automation 2025",
        "artificial intelligence job cuts companies",
        "despidos inteligencia artificial automatización",
    ],
    "empleos": [
        "AI jobs hiring engineers 2025",
        "artificial intelligence new jobs created",
        "empleos inteligencia artificial nuevos puestos",
    ],
}


@dataclass
class GdeltRadarArticle:
    titulo: str
    url: str
    fecha: str
    fuente: str
    resumen: str


def fetch_gdelt_articles(tipo: str, max_queries: int = 2) -> list[GdeltRadarArticle]:
    """Obtiene artículos de GDELT. Sin API key. tipo: 'despidos' | 'empleos'"""
    queries = _QUERIES.get(tipo, _QUERIES["despidos"])[:max_queries]
    scraper = GdeltScraper(queries=queries)
    raw_articles = scraper.fetch()

    results = []
    for a in raw_articles:
        results.append(GdeltRadarArticle(
            titulo=a.titulo,
            url=a.url,
            fecha=a.fecha_pub.strftime("%Y-%m-%d") if a.fecha_pub else "",
            fuente="gdelt",
            resumen=a.titulo,
        ))

    logger.info("gdelt_radar_fetch_complete", tipo=tipo, count=len(results))
    return results
