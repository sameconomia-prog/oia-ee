import logging
from dataclasses import dataclass
from sqlalchemy import func as sqlalchemy_func
from sqlalchemy.orm import Session
from pipeline.db.models import IES, CarreraIES, Noticia, Vacante
from pipeline.db.models_imss import EmpleoFormalIMSS

logger = logging.getLogger(__name__)

EMPLEO_BASE_DEFAULT = 1_000_000  # proxy cuando no hay matricula registrada


@dataclass
class D5Result:
    idr: float   # Índice Despidos por IA (proxy nacional) [0,1]  alto=más riesgo
    icg: float   # Índice Competitividad Geográfica [0,1]  alto=mejor
    ies_s: float # Score Empleo Sectorial por estado [0,1]  alto=mejor
    score: float # Score regional D5 [0,1]  alto=mejor


def calcular_idr(estado: str, session: Session) -> float:
    """IDR = despidos_IA_nacionales * 1000 / matricula_estado.
    Usa proxy nacional de despidos pues Noticia no almacena estado.
    5+ despidos por cada 1000 matriculados → 1.0 (máximo riesgo)."""
    despidos_nacionales = (
        session.query(Noticia)
        .filter(Noticia.causa_ia.isnot(None))
        .count()
    )
    matriculas = (
        session.query(IES.matricula_total)
        .filter(IES.estado == estado, IES.matricula_total.isnot(None))
        .all()
    )
    empleo = sum(m[0] for m in matriculas if m[0]) or EMPLEO_BASE_DEFAULT
    idr_raw = despidos_nacionales * 1000 / empleo
    return round(min(1.0, idr_raw / 5.0), 4)


def calcular_icg(estado: str, session: Session) -> float:
    """ICG = IES con al menos 1 carrera con skills actualizados / total IES activas en estado."""
    ies_list = session.query(IES).filter(IES.estado == estado, IES.activa == True).all()
    if not ies_list:
        return 0.5
    n_modernas = sum(
        1 for ies in ies_list
        if session.query(CarreraIES).filter(
            CarreraIES.ies_id == ies.id,
            CarreraIES.plan_estudio_skills.isnot(None),
            CarreraIES.plan_estudio_skills != "[]",
        ).first()
    )
    return round(n_modernas / len(ies_list), 4)


def calcular_ies_s(estado: str, session: Session) -> float:
    """IES_S basado en empleo formal IMSS cuando disponible, vacantes como fallback."""
    despidos_nacionales = (
        session.query(Noticia)
        .filter(Noticia.causa_ia.isnot(None))
        .count()
    )

    # Find the latest period first (ano, mes), then sum only that period
    latest = (
        session.query(EmpleoFormalIMSS.anio, EmpleoFormalIMSS.mes)
        .filter(EmpleoFormalIMSS.estado == estado)
        .order_by(EmpleoFormalIMSS.anio.desc(), EmpleoFormalIMSS.mes.desc())
        .first()
    )

    if latest:
        empleo = int(
            session.query(sqlalchemy_func.sum(EmpleoFormalIMSS.trabajadores))
            .filter(
                EmpleoFormalIMSS.estado == estado,
                EmpleoFormalIMSS.anio == latest.anio,
                EmpleoFormalIMSS.mes == latest.mes,
            )
            .scalar() or 0
        )
    else:
        empleo = session.query(Vacante).filter(Vacante.estado == estado).count()

    raw = (empleo - despidos_nacionales) / (empleo + despidos_nacionales + 1)
    return round((raw + 1) / 2, 4)


def calcular_d5(estado: str, session: Session) -> D5Result:
    idr = calcular_idr(estado, session)
    icg = calcular_icg(estado, session)
    ies_s = calcular_ies_s(estado, session)
    score = round((1 - idr) * 0.35 + icg * 0.35 + ies_s * 0.30, 4)
    return D5Result(idr=idr, icg=icg, ies_s=ies_s, score=score)
