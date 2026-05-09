# pipeline/jobs/occ_ingest_job.py
import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Vacante
from pipeline.scrapers.occ_scraper import OccScraper

logger = logging.getLogger(__name__)


@dataclass
class OccIngestResult:
    procesadas: int
    insertadas: int
    duplicadas: int


def run_occ_ingest(session: Session) -> OccIngestResult:
    """Scrape OCC TI vacantes, filtra IA, upsert en tabla vacantes (fuente='occ')."""
    vacantes = OccScraper().scrape()
    insertadas = duplicadas = 0

    for vac in vacantes:
        existing = session.query(Vacante).filter_by(fuente="occ", url=vac.url).first()
        if existing:
            duplicadas += 1
            continue
        v = Vacante(
            titulo=vac.titulo,
            empresa=vac.empresa,
            sector="Tecnología",
            skills=json.dumps(vac.skills) if vac.skills else None,
            salario_min=vac.salario_min,
            salario_max=vac.salario_max,
            fecha_pub=vac.fecha_pub,
            fuente="occ",
            pais="México",
            estado=vac.estado,
            nivel_educativo=vac.nivel_educativo,
            url=vac.url,
        )
        session.add(v)
        insertadas += 1

    session.flush()
    logger.info("occ_ingest: procesadas=%d insertadas=%d duplicadas=%d",
                len(vacantes), insertadas, duplicadas)
    return OccIngestResult(procesadas=len(vacantes), insertadas=insertadas, duplicadas=duplicadas)
