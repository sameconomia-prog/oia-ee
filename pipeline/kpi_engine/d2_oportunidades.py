# pipeline/kpi_engine/d2_oportunidades.py
import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Vacante, CarreraIES

logger = logging.getLogger(__name__)

EMERGING_SKILLS = frozenset({
    "python", "machine learning", "inteligencia artificial", "ia", "cloud",
    "data science", "nlp", "deep learning", "llm", "big data", "tensorflow",
    "pytorch", "kubernetes", "docker", "mlops",
})

MAX_VACANTES_IOE = 500


@dataclass
class D2Result:
    ioe: float
    ihe: float
    iea: float
    score: float


def calcular_ioe(session: Session) -> float:
    """Porcentaje de vacantes con al menos un skill emergente."""
    vacantes = session.query(Vacante).limit(MAX_VACANTES_IOE).all()
    if not vacantes:
        return 0.0
    count = sum(
        1 for v in vacantes
        if set(s.lower().strip() for s in _parse_skills(v.skills)) & EMERGING_SKILLS
    )
    return count / len(vacantes)


def calcular_ihe(carrera_ies: CarreraIES) -> float:
    """Overlap entre plan de estudios y skills emergentes conocidas."""
    plan = set(s.lower().strip() for s in _parse_skills(carrera_ies.plan_estudio_skills))
    if not plan:
        return 0.0
    return min(1.0, len(plan & EMERGING_SKILLS) / len(EMERGING_SKILLS))


def calcular_iea(carrera_ies: CarreraIES, session: Session) -> float:
    """Tasa egresados/matrícula ajustada por demanda de mercado."""
    matricula = max(1, carrera_ies.matricula or 1)
    egresados = max(0, carrera_ies.egresados or 0)
    tasa_egreso = min(1.0, egresados / matricula)
    n_vacantes = session.query(Vacante).count()
    factor_mercado = min(1.0, n_vacantes / max(1, egresados))
    return round(tasa_egreso * 0.6 + factor_mercado * 0.4, 4)


def calcular_d2(carrera_ies: CarreraIES, session: Session) -> D2Result:
    ioe = calcular_ioe(session)
    ihe = calcular_ihe(carrera_ies)
    iea = calcular_iea(carrera_ies, session)
    score = ioe * 0.4 + ihe * 0.35 + iea * 0.25
    return D2Result(ioe=round(ioe, 4), ihe=round(ihe, 4), iea=round(iea, 4), score=round(score, 4))


def _parse_skills(raw: str | None) -> list[str]:
    try:
        return json.loads(raw or "[]")
    except (json.JSONDecodeError, TypeError):
        return []
