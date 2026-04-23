# pipeline/kpi_engine/d4_institucional.py
import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import CarreraIES

logger = logging.getLogger(__name__)

COSTO_REF_MXN = 80_000  # referencia anual carrera privada México


@dataclass
class D4Result:
    tra: float
    irf: float
    cad: float
    score: float


def calcular_tra(carreras_ies: list[CarreraIES]) -> float:
    """Tasa Retención-Absorción: Σegresados / Σmatricula del IES. [0,1]"""
    total_mat = sum(c.matricula or 0 for c in carreras_ies)
    total_egr = sum(c.egresados or 0 for c in carreras_ies)
    return round(min(1.0, total_egr / max(1, total_mat)), 4)


def calcular_irf(carreras_ies: list[CarreraIES]) -> float:
    """Índice Riesgo Financiero: avg(costo_anual_mxn) / COSTO_REF. [0,1]"""
    costos = [c.costo_anual_mxn for c in carreras_ies if c.costo_anual_mxn]
    if not costos:
        return 0.5
    avg_costo = sum(costos) / len(costos)
    return round(min(1.0, avg_costo / COSTO_REF_MXN), 4)


def _parse_skills(raw: str | None) -> list[str]:
    try:
        return json.loads(raw or "[]")
    except (json.JSONDecodeError, TypeError):
        return []


def calcular_cad(carreras_ies: list[CarreraIES]) -> float:
    """Cobertura Actualización Digital: carreras con plan_skills / total. [0,1]"""
    if not carreras_ies:
        return 0.5
    n_con_skills = sum(
        1 for c in carreras_ies
        if len(_parse_skills(c.plan_estudio_skills)) > 0
    )
    return round(n_con_skills / len(carreras_ies), 4)


def calcular_d4(ies_id: str, session: Session) -> D4Result:
    carreras_ies = session.query(CarreraIES).filter_by(ies_id=ies_id).all()
    if not carreras_ies:
        return D4Result(tra=0.5, irf=0.5, cad=0.5, score=0.5)
    tra = calcular_tra(carreras_ies)
    irf = calcular_irf(carreras_ies)
    cad = calcular_cad(carreras_ies)
    score = round(tra * 0.40 + cad * 0.35 + (1.0 - irf) * 0.25, 4)
    return D4Result(tra=tra, irf=irf, cad=cad, score=score)
