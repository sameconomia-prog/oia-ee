import json
import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path
from sqlalchemy.orm import Session
import httpx
from pipeline.db.models import Vacante
from pipeline.loaders.stps_loader import StpsLoader, StpsVacante

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


_STPS_CSV_URL = (
    "https://www.observatoriolaboral.gob.mx/static/"
    "preparate-para-el-empleo/Oferta_Laboral_Mexico.csv"
)


def _download_stps_csv() -> Path:
    resp = httpx.get(_STPS_CSV_URL, timeout=60.0, follow_redirects=True)
    resp.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False)
    tmp.write(resp.content)
    tmp.close()
    return Path(tmp.name)


def run_stps_ingest(session: Session, csv_path: Path | None = None) -> StpsIngestResult:
    """Wrapper público: descarga CSV si csv_path=None, luego llama ingest_stps."""
    if csv_path is None:
        csv_path = _download_stps_csv()
    vacantes = StpsLoader().load_csv(csv_path)
    return ingest_stps(vacantes, session)
