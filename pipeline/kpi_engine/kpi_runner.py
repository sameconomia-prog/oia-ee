# pipeline/kpi_engine/kpi_runner.py
import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Carrera, CarreraIES, Ocupacion, IES
from pipeline.kpi_engine.d1_obsolescencia import calcular_d1, D1Result
from pipeline.kpi_engine.d2_oportunidades import calcular_d2, D2Result
from pipeline.kpi_engine.d3_mercado import calcular_d3, D3Result
from pipeline.kpi_engine.d4_institucional import calcular_d4, D4Result
from pipeline.kpi_engine.d5_geografia import calcular_d5, D5Result
from pipeline.kpi_engine.d6_estudiantil import calcular_d6, D6Result

logger = logging.getLogger(__name__)


@dataclass
class KpiResult:
    carrera_id: str
    d1_obsolescencia: D1Result
    d2_oportunidades: D2Result
    d3_mercado: D3Result
    d6_estudiantil: D6Result


@dataclass
class IesKpiResult:
    ies_id: str
    d4_institucional: D4Result


@dataclass
class EstadoKpiResult:
    estado: str
    d5_geografia: D5Result


def run_kpis(carrera_id: str, session: Session) -> KpiResult | None:
    """Calcula D1+D2+D3+D6 para una carrera. Retorna None si no existe o sin datos de matrícula."""
    carrera = session.query(Carrera).filter_by(id=carrera_id).first()
    if not carrera:
        logger.debug("run_kpis: carrera %s no encontrada", carrera_id)
        return None
    carrera_ies = session.query(CarreraIES).filter_by(carrera_id=carrera_id).first()
    if not carrera_ies:
        logger.debug("run_kpis: sin datos de matrícula para carrera %s", carrera_id)
        return None

    sector = _sector_de_carrera(carrera, session)
    d1 = calcular_d1(carrera, carrera_ies, session)
    d2 = calcular_d2(carrera_ies, session)
    d3 = calcular_d3(carrera_ies, session, sector=sector)
    d6 = calcular_d6(carrera, carrera_ies, d1, d2, session, sector=sector)

    return KpiResult(
        carrera_id=carrera_id,
        d1_obsolescencia=d1,
        d2_oportunidades=d2,
        d3_mercado=d3,
        d6_estudiantil=d6,
    )


def run_kpis_ies(ies_id: str, session: Session) -> IesKpiResult | None:
    """Calcula D4 para una IES. Retorna None si la IES no existe."""
    ies = session.query(IES).filter_by(id=ies_id).first()
    if not ies:
        logger.debug("run_kpis_ies: IES %s no encontrada", ies_id)
        return None
    d4 = calcular_d4(ies_id, session)
    return IesKpiResult(ies_id=ies_id, d4_institucional=d4)


def run_kpis_estado(estado: str, session: Session) -> EstadoKpiResult:
    """Calcula D5 para un estado. Siempre retorna resultado (con defaults si sin datos)."""
    d5 = calcular_d5(estado, session)
    return EstadoKpiResult(estado=estado, d5_geografia=d5)


def _sector_de_carrera(carrera: Carrera, session: Session) -> str | None:
    """Deriva el sector de la primera ocupación ONET asociada a la carrera."""
    try:
        codes = json.loads(carrera.onet_codes_relacionados or "[]")
    except (json.JSONDecodeError, TypeError):
        return None
    if not codes:
        return None
    occ = session.query(Ocupacion).filter_by(onet_code=codes[0]).first()
    return occ.sector if occ else None
