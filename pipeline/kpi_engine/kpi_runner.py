# pipeline/kpi_engine/kpi_runner.py
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Carrera, CarreraIES
from pipeline.kpi_engine.d1_obsolescencia import calcular_d1, D1Result
from pipeline.kpi_engine.d2_oportunidades import calcular_d2, D2Result

logger = logging.getLogger(__name__)


@dataclass
class KpiResult:
    carrera_id: str
    d1_obsolescencia: D1Result
    d2_oportunidades: D2Result


def run_kpis(carrera_id: str, session: Session) -> KpiResult | None:
    """Calcula D1+D2 para una carrera. Retorna None si no existe o sin datos de matrícula."""
    carrera = session.query(Carrera).filter_by(id=carrera_id).first()
    if not carrera:
        logger.debug("run_kpis: carrera %s no encontrada", carrera_id)
        return None
    carrera_ies = session.query(CarreraIES).filter_by(carrera_id=carrera_id).first()
    if not carrera_ies:
        logger.debug("run_kpis: sin datos de matrícula para carrera %s", carrera_id)
        return None
    d1 = calcular_d1(carrera, carrera_ies, session)
    d2 = calcular_d2(carrera_ies, session)
    return KpiResult(carrera_id=carrera_id, d1_obsolescencia=d1, d2_oportunidades=d2)
