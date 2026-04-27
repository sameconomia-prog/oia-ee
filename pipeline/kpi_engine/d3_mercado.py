import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Noticia, Vacante, CarreraIES
from pipeline.db.models_enoe import IndicadorENOE

logger = logging.getLogger(__name__)

MAX_VACANTES_D3 = 500
_TASA_REFERENCIA = 3.5
EMERGING_SKILLS = frozenset({
    "python", "machine learning", "inteligencia artificial", "ia", "cloud",
    "data science", "nlp", "deep learning", "llm", "big data", "tensorflow",
    "pytorch", "kubernetes", "docker", "mlops",
})


@dataclass
class D3Result:
    tdm: float
    tvc: float
    brs: float
    ice: float
    score: float


def calcular_factor_macro(session: Session) -> float:
    """Factor multiplicador basado en tasa de desempleo nacional ENOE.

    Referencia sana: 3.5%. Por encima → amplifica riesgo TDM. Sin datos → 1.0.
    """
    latest = (
        session.query(IndicadorENOE.anio, IndicadorENOE.trimestre,
                      IndicadorENOE.tasa_desempleo)
        .filter(IndicadorENOE.estado == "Nacional",
                IndicadorENOE.tasa_desempleo.isnot(None))
        .order_by(IndicadorENOE.anio.desc(), IndicadorENOE.trimestre.desc())
        .first()
    )
    if latest is None or latest.tasa_desempleo is None:
        return 1.0
    return round(float(latest.tasa_desempleo) / _TASA_REFERENCIA, 4)


def calcular_tdm(session: Session, sector: str | None = None) -> float:
    """Tasa de Desplazamiento por Mercado: despidos_IA / vacantes en sector. [0,1]"""
    q_despidos = session.query(Noticia).filter(Noticia.tipo_impacto == "despido")
    q_vacantes = session.query(Vacante)
    if sector:
        q_despidos = q_despidos.filter(Noticia.sector == sector)
        q_vacantes = q_vacantes.filter(Vacante.sector == sector)
    n_despidos = q_despidos.count()
    n_vacantes = q_vacantes.count()
    if n_vacantes == 0:
        return 0.0
    tdm_raw = n_despidos / n_vacantes
    factor = calcular_factor_macro(session)
    return min(1.0, round(tdm_raw * factor, 4))


def calcular_tvc(session: Session, sector: str | None = None) -> float:
    """Tasa de Vacantes vs Ceses: vacantes_IA / despidos_IA. >1 = neto positivo."""
    q_noticias = session.query(Noticia).filter(Noticia.tipo_impacto == "despido")
    q_vacantes = session.query(Vacante)
    if sector:
        q_noticias = q_noticias.filter(Noticia.sector == sector)
        q_vacantes = q_vacantes.filter(Vacante.sector == sector)
    n_despidos = q_noticias.count()
    vacantes = q_vacantes.limit(MAX_VACANTES_D3).all()
    n_ia = sum(
        1 for v in vacantes
        if set(s.lower().strip() for s in _parse_skills(v.skills)) & EMERGING_SKILLS
    )
    return n_ia / max(1, n_despidos)


def calcular_brs(carrera_ies: CarreraIES, session: Session) -> float:
    """Brecha de Reskilling: skills plan no demandados / total plan. [0,1]"""
    plan = set(s.lower().strip() for s in _parse_skills(carrera_ies.plan_estudio_skills))
    if not plan:
        return 0.5
    vacantes = session.query(Vacante).limit(MAX_VACANTES_D3).all()
    demanded: set[str] = set()
    for v in vacantes:
        demanded.update(s.lower().strip() for s in _parse_skills(v.skills))
    if not demanded:
        return 0.5
    missing = len(plan - demanded)
    return round(missing / len(plan), 4)


def calcular_ice(session: Session, sector: str | None = None) -> float:
    """Índice de Cobertura Emergente: vacantes_IA_sector / total_vacantes_sector. [0,1]"""
    q = session.query(Vacante)
    if sector:
        q = q.filter(Vacante.sector == sector)
    vacantes = q.limit(MAX_VACANTES_D3).all()
    if not vacantes:
        return 0.0
    n_ia = sum(
        1 for v in vacantes
        if set(s.lower().strip() for s in _parse_skills(v.skills)) & EMERGING_SKILLS
    )
    return round(n_ia / len(vacantes), 4)


def calcular_d3(carrera_ies: CarreraIES, session: Session, sector: str | None = None) -> D3Result:
    tdm = calcular_tdm(session, sector=sector)
    tvc = calcular_tvc(session, sector=sector)
    brs = calcular_brs(carrera_ies, session)
    ice = calcular_ice(session, sector=sector)
    score = round(min(1.0, tdm * 0.4 + brs * 0.4 + max(0.0, 1.0 - tvc) * 0.2), 4)
    return D3Result(
        tdm=round(tdm, 4),
        tvc=round(tvc, 4),
        brs=round(brs, 4),
        ice=round(ice, 4),
        score=score,
    )


def _parse_skills(raw: str | None) -> list[str]:
    try:
        return json.loads(raw or "[]")
    except (json.JSONDecodeError, TypeError):
        return []
