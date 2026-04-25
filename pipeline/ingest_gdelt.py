# pipeline/ingest_gdelt.py
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Noticia
from pipeline.scrapers.gdelt_scraper import GdeltScraper, DEFAULT_QUERIES
from pipeline.utils.claude_client import ClaudeClient
from pipeline.utils.embeddings import embed_text, store_embedding

logger = logging.getLogger(__name__)


@dataclass
class IngestResult:
    fetched: int
    stored: int
    classified: int
    embedded: int


def run_gdelt_pipeline(
    session: Session,
    api_key_claude: str,
    api_key_voyage: str,
    queries: list[str] = None,
) -> IngestResult:
    """Fetch GDELT articles, store new ones, classify with Claude, embed with Voyage AI."""
    queries = queries or DEFAULT_QUERIES
    articles = GdeltScraper(queries=queries).fetch()
    fetched = len(articles)

    claude = ClaudeClient(api_key=api_key_claude) if api_key_claude else None
    stored = classified = embedded = 0

    for article in articles:
        if session.query(Noticia).filter_by(url=article.url).first():
            continue

        noticia = Noticia(
            titulo=article.titulo,
            url=article.url,
            fuente=article.fuente,
            pais=article.pais,
            fecha_pub=article.fecha_pub,
            raw_content=article.contenido,
        )
        session.add(noticia)
        session.flush()
        stored += 1

        try:
            result = claude.clasificar_noticia(noticia.titulo, noticia.raw_content or "") if claude else None
            if result:
                noticia.sector = result.sector
                noticia.tipo_impacto = result.tipo_impacto
                noticia.n_empleados = result.n_empleados_afectados
                noticia.empresa = result.empresa
                noticia.causa_ia = result.causa_ia
                noticia.resumen_claude = result.resumen
                classified += 1
        except Exception as e:
            logger.error("Classify error for %s: %s", noticia.url, e)

        try:
            vector = embed_text(noticia.titulo, api_key=api_key_voyage)
            if vector:
                store_embedding(noticia.id, vector, session)
                embedded += 1
        except Exception as e:
            logger.error("Embed error for %s: %s", noticia.url, e)

    return IngestResult(fetched=fetched, stored=stored, classified=classified, embedded=embedded)
