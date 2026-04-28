"""
Scheduler de pipelines de ingestión con APScheduler.
Corre como proceso independiente: python -m pipeline.scheduler

Variables de entorno:
  STPS_CSV_PATH   — ruta al CSV de vacantes STPS (activa el job diario)
  ANUIES_CSV_PATH — ruta al CSV anual ANUIES (activa el job semanal)
  NEWSAPI_KEY     — API key de NewsAPI
  ANTHROPIC_API_KEY — API key de Anthropic para clasificación
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
    from pipeline.jobs.news_ingest_job import run_news_ingest
    from pipeline.db import get_session
    with get_session() as session:
        result = run_news_ingest(session)
        session.commit()
    logger.info("news_ingest OK: %s", result)


def run_stps_loader():
    from pipeline.jobs.stps_ingest_job import run_stps_ingest
    from pipeline.db import get_session
    with get_session() as session:
        result = run_stps_ingest(session)
        session.commit()
    logger.info("stps_ingest OK: %s", result)


def run_kpi_snapshot_job():
    from pipeline.jobs.kpi_snapshot_job import run_kpi_snapshot
    from pipeline.db import get_session
    with get_session() as session:
        result = run_kpi_snapshot(session)
        session.commit()
    logger.info("kpi_snapshot OK: %s", result)


def run_anuies_loader():
    path_env = os.getenv("ANUIES_CSV_PATH")
    if not path_env:
        logger.warning("ANUIES_CSV_PATH no configurado — job omitido")
        return
    from pathlib import Path
    from pipeline.loaders.anuies_loader import AnuiesLoader
    from pipeline.jobs.anuies_ingest_job import ingest_anuies
    from pipeline.db import get_session
    records = AnuiesLoader().load_csv(Path(path_env))
    with get_session() as session:
        result = ingest_anuies(records, session)
        session.commit()
    logger.info("anuies_ingest OK: %s", result)


def run_imss_loader():
    from pipeline.jobs.imss_ingest_job import run_imss_ingest
    from pipeline.db import get_session
    with get_session() as session:
        result = run_imss_ingest(session)
        session.commit()
    logger.info("imss_ingest OK: %s", result)


def run_enoe_loader():
    from pipeline.jobs.enoe_ingest_job import run_enoe_ingest
    from pipeline.db import get_session
    with get_session() as session:
        result = run_enoe_ingest(session)
        session.commit()
    logger.info("enoe_ingest OK: %s", result)


scheduler.add_job(
    run_news_scraper,
    trigger=CronTrigger(hour="*/6"),
    id="news_scraper",
    name="Scraper noticias (RSS + NewsAPI)",
    replace_existing=True,
)

scheduler.add_job(
    run_stps_loader,
    trigger=CronTrigger(hour=2, minute=0),
    id="stps_loader",
    name="Carga STPS vacantes",
    replace_existing=True,
)

scheduler.add_job(
    run_anuies_loader,
    trigger=CronTrigger(day_of_week="sun", hour=4),
    id="anuies_loader",
    name="Carga ANUIES anual",
    replace_existing=True,
)

scheduler.add_job(
    run_kpi_snapshot_job,
    trigger=CronTrigger(day_of_week="mon", hour=5),
    id="kpi_snapshot",
    name="Snapshot KPIs histórico (semanal)",
    replace_existing=True,
)

scheduler.add_job(
    run_imss_loader,
    trigger=CronTrigger(day=15, hour=3, minute=0),
    id="imss_loader",
    name="Carga IMSS empleo formal mensual",
    replace_existing=True,
)

scheduler.add_job(
    run_enoe_loader,
    trigger=CronTrigger(month="1,4,7,10", day=20, hour=4, minute=0),
    id="enoe_loader",
    name="Carga INEGI ENOE trimestral",
    replace_existing=True,
)

if __name__ == "__main__":
    logger.info("Iniciando scheduler OIA-EE...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler detenido")
