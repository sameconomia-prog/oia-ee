"""
Scheduler de pipelines de ingestión con APScheduler.
Corre como proceso independiente: python -m pipeline.scheduler
"""
import logging
import os
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

scheduler = BlockingScheduler(timezone="America/Mexico_City")


def run_news_scraper():
    """Scrapes RSS + NewsAPI and saves new articles to DB."""
    from pipeline.scrapers.news_scraper import NewsScraper
    from pipeline.utils.claude_client import ClaudeClient
    from pipeline.db import get_session
    from pipeline.db.models import Noticia

    newsapi_key = os.getenv("NEWSAPI_KEY")
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    scraper = NewsScraper(newsapi_key=newsapi_key)
    claude = ClaudeClient(api_key=api_key)

    articles = scraper.scrape()
    logger.info("Noticias scrapeadas: %d", len(articles))

    with get_session() as session:
        for art in articles:
            exists = session.query(Noticia).filter_by(url=art.url).first()
            if exists:
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
    logger.info("News pipeline completado")


def run_onet_loader():
    """Updates ONET occupation data (weekly)."""
    logger.info("ONET loader iniciado — implementación en Sprint 2")


def run_stps_loader():
    """Updates STPS vacancies (daily)."""
    logger.info("STPS loader iniciado — implementar ruta de descarga")


def run_anuies_loader():
    """Loads ANUIES data (annual — manual trigger)."""
    logger.info("ANUIES loader iniciado — implementar ruta de archivo")


# Noticias: cada 6 horas
scheduler.add_job(
    run_news_scraper,
    trigger=CronTrigger(hour="*/6"),
    id="news_scraper",
    name="Scraper de noticias (RSS + NewsAPI)",
    replace_existing=True,
)

# STPS vacantes: diario a las 2am
scheduler.add_job(
    run_stps_loader,
    trigger=CronTrigger(hour=2, minute=0),
    id="stps_loader",
    name="Carga STPS vacantes",
    replace_existing=True,
)

# ONET: domingo 3am
scheduler.add_job(
    run_onet_loader,
    trigger=CronTrigger(day_of_week="sun", hour=3),
    id="onet_loader",
    name="Actualización ONET ocupaciones",
    replace_existing=True,
)

if __name__ == "__main__":
    logger.info("Iniciando scheduler OIA-EE...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler detenido")
