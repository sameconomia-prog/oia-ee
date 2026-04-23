import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Carrera, CarreraIES, Vacante, Ocupacion
from pipeline.kpi_engine.d1_obsolescencia import D1Result
from pipeline.kpi_engine.d2_oportunidades import D2Result

logger = logging.getLogger(__name__)

COSTO_ANUAL_DEFAULT = 50_000  # MXN — costo aproximado anual promedio carrera privada México
USD_TO_MXN = 18.0             # factor de conversión aproximado
MAX_VACANTES_SAL = 200


@dataclass
class D6Result:
    iei: float
    crc: float
    roi_e: float
    score: float


def calcular_iei(carrera_ies: CarreraIES, d1: D1Result, d2: D2Result) -> float:
    """Índice de Empleabilidad Individual: (1-IVA) * p_empleo * (1+IOE). [0,1]"""
    p_empleo = min(1.0, (carrera_ies.egresados or 0) / max(1, carrera_ies.matricula or 1))
    raw = (1.0 - d1.iva) * p_empleo * (1.0 + d2.ioe)
    return round(min(1.0, raw), 4)


def calcular_crc(carrera_ies: CarreraIES, d1: D1Result) -> float:
    """Coeficiente de Riesgo Crediticio: IVA * (1 - p_empleo). [0,1]"""
    p_empleo = min(1.0, (carrera_ies.egresados or 0) / max(1, carrera_ies.matricula or 1))
    return round(min(1.0, d1.iva * (1.0 - p_empleo)), 4)


def calcular_roi_e(
    carrera_ies: CarreraIES,
    d1: D1Result,
    session: Session,
    sector: str | None = None,
    onet_codes: list[str] | None = None,
) -> float:
    """ROI Educativo: (sal_esperado * p_empleo * (1-IVA)) / costo_anual. [0,1]"""
    sal_esperado = _salario_esperado(session, sector=sector, onet_codes=onet_codes)
    p_empleo = min(1.0, (carrera_ies.egresados or 0) / max(1, carrera_ies.matricula or 1))
    raw = (sal_esperado * p_empleo * (1.0 - d1.iva)) / COSTO_ANUAL_DEFAULT
    return round(min(1.0, raw), 4)


def calcular_d6(
    carrera: Carrera,
    carrera_ies: CarreraIES,
    d1: D1Result,
    d2: D2Result,
    session: Session,
    sector: str | None = None,
) -> D6Result:
    onet_codes: list[str] = []
    try:
        onet_codes = json.loads(carrera.onet_codes_relacionados or "[]")
    except (json.JSONDecodeError, TypeError):
        pass
    iei = calcular_iei(carrera_ies, d1, d2)
    crc = calcular_crc(carrera_ies, d1)
    roi_e = calcular_roi_e(carrera_ies, d1, session, sector=sector, onet_codes=onet_codes)
    score = round(iei * 0.4 + (1.0 - crc) * 0.35 + roi_e * 0.25, 4)
    return D6Result(iei=iei, crc=crc, roi_e=roi_e, score=score)


def _salario_esperado(
    session: Session,
    sector: str | None,
    onet_codes: list[str] | None,
) -> float:
    """Promedio de salario_min de vacantes del sector; fallback a ocupacion.salario_mediana_usd."""
    q = session.query(Vacante).filter(Vacante.salario_min.isnot(None))
    if sector:
        q = q.filter(Vacante.sector == sector)
    vacantes = q.limit(MAX_VACANTES_SAL).all()
    if vacantes:
        return sum(v.salario_min for v in vacantes) / len(vacantes)
    if onet_codes:
        occs = session.query(Ocupacion).filter(
            Ocupacion.onet_code.in_(onet_codes),
            Ocupacion.salario_mediana_usd.isnot(None),
        ).all()
        if occs:
            avg_usd = sum(float(o.salario_mediana_usd) for o in occs) / len(occs)
            return avg_usd * USD_TO_MXN / 12  # USD anual → MXN mensual
    return COSTO_ANUAL_DEFAULT * 0.5  # última instancia: 25,000 MXN/mes
