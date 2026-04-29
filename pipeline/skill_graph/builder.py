"""Agrega skills de vacantes OCC y calcula ia_score + tendencia por skill."""
from __future__ import annotations
import json
from collections import Counter
from datetime import date, timedelta

from sqlalchemy.orm import Session

from pipeline.db.models import Vacante, Carrera
from pipeline.skill_graph.taxonomy import get_ia_label, get_ia_score

_RECENT_DAYS = 180
_PAST_DAYS = 365


def _parse_skills(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(s).lower().strip() for s in data if s]
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def _skill_trend(skill: str, all_vacantes: list[Vacante]) -> float:
    """Delta de frecuencia: positivo = creciendo, negativo = declinando."""
    today = date.today()
    cutoff_recent = today - timedelta(days=_RECENT_DAYS)
    cutoff_past = today - timedelta(days=_PAST_DAYS)

    recent = [v for v in all_vacantes if v.fecha_pub and v.fecha_pub >= cutoff_recent]
    past = [v for v in all_vacantes if v.fecha_pub and cutoff_past <= v.fecha_pub < cutoff_recent]

    def freq(vacantes: list[Vacante]) -> float:
        if not vacantes:
            return 0.0
        count = sum(1 for v in vacantes if skill in _parse_skills(v.skills))
        return count / len(vacantes)

    return round(freq(recent) - freq(past), 4)


def build_skill_graph(carrera_id: str, db: Session, top_n: int = 20) -> dict:
    """Construye el grafo de skills para una carrera.

    Agrega skills del pool nacional de vacantes OCC.
    Retorna top_n skills más frecuentes con ia_score y tendencia 12m.
    """
    carrera = db.query(Carrera).filter_by(id=carrera_id).first()
    if not carrera:
        return {
            "carrera_id": carrera_id,
            "carrera_nombre": None,
            "skill_count": 0,
            "pct_en_transicion": 0.0,
            "skills": [],
        }

    all_vacantes = db.query(Vacante).all()

    counter: Counter = Counter()
    for v in all_vacantes:
        for skill in _parse_skills(v.skills):
            counter[skill] += 1

    if not counter:
        return {
            "carrera_id": carrera_id,
            "carrera_nombre": carrera.nombre_norm,
            "skill_count": 0,
            "pct_en_transicion": 0.0,
            "skills": [],
        }

    top_skills = counter.most_common(top_n)
    total_mentions = sum(counter.values())

    skills_out = [
        {
            "name": skill_name,
            "weight": round(count / total_mentions, 4),
            "ia_score": get_ia_score(skill_name),
            "ia_label": get_ia_label(skill_name),
            "trend_12m": _skill_trend(skill_name, all_vacantes),
        }
        for skill_name, count in top_skills
    ]

    en_transicion = [s for s in skills_out if s["ia_label"] in ("automated", "augmented")]
    pct = round(len(en_transicion) / len(skills_out), 2) if skills_out else 0.0

    return {
        "carrera_id": carrera_id,
        "carrera_nombre": carrera.nombre_norm,
        "skill_count": len(skills_out),
        "pct_en_transicion": pct,
        "skills": skills_out,
    }
