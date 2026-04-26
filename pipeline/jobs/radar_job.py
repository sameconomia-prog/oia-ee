# pipeline/jobs/radar_job.py
"""Jobs automáticos para el Radar de Impacto IA."""
import structlog
from pipeline.db import get_session
from pipeline.radar.ingestor import run_radar_ingestion
from pipeline.radar.obsidian_sync import sync_all_unsynced_despidos

logger = structlog.get_logger()


def run_radar_despidos_job() -> None:
    """Job diario: ingesta de noticias de despidos por IA."""
    with get_session() as db:
        result = run_radar_ingestion(db, tipo="despidos")
        logger.info("radar_despidos_job_done", **result.__dict__)


def run_radar_empleos_job() -> None:
    """Job diario: ingesta de noticias de empleos generados por IA."""
    with get_session() as db:
        result = run_radar_ingestion(db, tipo="empleos")
        logger.info("radar_empleos_job_done", **result.__dict__)


def run_obsidian_sync_job() -> None:
    """Job semanal: sincronizar eventos nuevos a Obsidian vault."""
    with get_session() as db:
        written = sync_all_unsynced_despidos(db)
        logger.info("obsidian_sync_job_done", notas_escritas=written)
