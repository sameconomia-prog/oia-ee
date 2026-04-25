import logging
import os
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Noticia
from pipeline.scrapers.news_scraper import NewsScraper
from pipeline.utils.claude_client import ClaudeClient
from pipeline.utils.rule_classifier import RuleClassifier

logger = logging.getLogger(__name__)


@dataclass
class NewsIngestResult:
    fetched: int
    stored: int
    classified: int


def run_news_ingest(
    session: Session,
    newsapi_key: str | None = None,
    anthropic_key: str | None = None,
) -> NewsIngestResult:
    """Scrape RSS + NewsAPI, persist nuevas noticias y clasifica con Claude."""
    newsapi_key = newsapi_key or os.getenv("NEWSAPI_KEY")
    anthropic_key = anthropic_key or os.getenv("ANTHROPIC_API_KEY", "")

    scraper = NewsScraper(newsapi_key=newsapi_key)
    claude = ClaudeClient(api_key=anthropic_key) if anthropic_key else RuleClassifier()

    articles = scraper.scrape()
    fetched = len(articles)
    stored = classified = 0

    for art in articles:
        if session.query(Noticia).filter_by(url=art.url).first():
            continue
        clasificacion = claude.clasificar_noticia(art.titulo, art.contenido)
        noticia = Noticia(
            titulo=art.titulo,
            url=art.url,
            fuente=art.fuente,
            fecha_pub=art.fecha_pub,
            pais=art.pais,
            sector=clasificacion.sector if clasificacion else None,
            tipo_impacto=clasificacion.tipo_impacto if clasificacion else None,
            n_empleados=clasificacion.n_empleados_afectados if clasificacion else None,
            empresa=clasificacion.empresa if clasificacion else None,
            causa_ia=clasificacion.causa_ia if clasificacion else None,
            resumen_claude=clasificacion.resumen if clasificacion else None,
            raw_content=art.contenido,
        )
        session.add(noticia)
        stored += 1
        if clasificacion:
            classified += 1

    session.flush()
    logger.info("news_ingest: fetched=%d stored=%d classified=%d", fetched, stored, classified)
    return NewsIngestResult(fetched=fetched, stored=stored, classified=classified)
