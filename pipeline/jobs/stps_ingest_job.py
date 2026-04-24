import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Vacante
from pipeline.loaders.stps_loader import StpsVacante

logger = logging.getLogger(__name__)


@dataclass
class StpsIngestResult:
    procesadas: int
    insertadas: int
    duplicadas: int


def ingest_stps(vacantes: list[StpsVacante], session: Session) -> StpsIngestResult:
    """Persiste vacantes STPS en la tabla Vacante. Dedup por (titulo, empresa, fecha_pub)."""
    insertadas = duplicadas = 0

    for vac in vacantes:
        q = session.query(Vacante).filter_by(
            titulo=vac.titulo,
            empresa=vac.empresa,
            fecha_pub=vac.fecha_pub,
        )
        if q.first():
            duplicadas += 1
            continue

        v = Vacante(
            titulo=vac.titulo,
            empresa=vac.empresa,
            sector=vac.sector,
            skills=json.dumps(vac.skills) if vac.skills else None,
            salario_min=vac.salario_min,
            salario_max=vac.salario_max,
            fecha_pub=vac.fecha_pub,
            fuente="stps",
            pais="México",
            estado=vac.estado,
            nivel_educativo=vac.nivel_educativo,
            experiencia_anios=vac.experiencia_anios,
        )
        session.add(v)
        insertadas += 1

    session.flush()
    logger.info("stps_ingest: procesadas=%d insertadas=%d duplicadas=%d",
                len(vacantes), insertadas, duplicadas)
    return StpsIngestResult(procesadas=len(vacantes), insertadas=insertadas, duplicadas=duplicadas)
