# pipeline/kpi_engine/d1_obsolescencia.py
import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Ocupacion, Vacante, CarreraIES, Carrera

logger = logging.getLogger(__name__)

MAX_VACANTES_BES = 200  # cap to avoid full-table scans in large DBs


@dataclass
class D1Result:
    iva: float
    bes: float
    vac: float
    score: float


def calcular_iva(carrera: Carrera, session: Session) -> float:
    """Promedio de p_automatizacion de ocupaciones ONET relacionadas. Default 0.5 si no hay datos."""
    try:
        codes = json.loads(carrera.onet_codes_relacionados or "[]")
    except json.JSONDecodeError:
        return 0.5
    if not codes:
        logger.debug("IVA default: no ONET codes for carrera %s", carrera.id)
        return 0.5
    ocupaciones = session.query(Ocupacion).filter(Ocupacion.onet_code.in_(codes)).all()
    vals = [float(o.p_automatizacion) for o in ocupaciones if o.p_automatizacion is not None]
    if not vals:
        logger.debug("IVA default: no ocupaciones found for carrera %s", carrera.id)
        return 0.5
    return sum(vals) / len(vals)


def calcular_bes(carrera_ies: CarreraIES, session: Session) -> float:
    """Brecha entre skills del plan de estudios y skills demandadas en vacantes. Alta brecha = peor."""
    try:
        plan_skills = set(s.lower().strip() for s in json.loads(carrera_ies.plan_estudio_skills or "[]"))
    except json.JSONDecodeError:
        return 0.5
    if not plan_skills:
        logger.debug("BES default: empty plan_skills")
        return 0.5
    vacantes = session.query(Vacante).limit(MAX_VACANTES_BES).all()
    demanded: set[str] = set()
    for v in vacantes:
        try:
            demanded.update(s.lower().strip() for s in json.loads(v.skills or "[]"))
        except json.JSONDecodeError:
            pass
    if not demanded:
        logger.debug("BES default: no vacantes found")
        return 0.5
    overlap = len(plan_skills & demanded)
    return 1.0 - (overlap / len(plan_skills))


def calcular_vac(carrera_ies: CarreraIES, session: Session) -> float:
    """Más vacantes disponibles = menor obsolescencia (resultado invertido)."""
    egresados = max(1, carrera_ies.egresados or 1)
    n_vacantes = session.query(Vacante).count()
    ratio = min(1.0, n_vacantes / egresados)
    return 1.0 - ratio


def calcular_d1(carrera: Carrera, carrera_ies: CarreraIES, session: Session) -> D1Result:
    iva = calcular_iva(carrera, session)
    bes = calcular_bes(carrera_ies, session)
    vac = calcular_vac(carrera_ies, session)
    score = iva * 0.5 + bes * 0.3 + vac * 0.2
    return D1Result(iva=round(iva, 4), bes=round(bes, 4), vac=round(vac, 4), score=round(score, 4))
