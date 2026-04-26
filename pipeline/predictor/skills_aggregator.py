import re
import structlog
from collections import Counter
from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from pipeline.db.models import Vacante
from pipeline.db.models_radar import SkillEmergente

logger = structlog.get_logger()

_DAYS_BACK = 30
_MIN_SKILL_LEN = 2
_MAX_SKILL_LEN = 100


def _parse_skills(raw: str) -> list[str]:
    if not raw:
        return []
    try:
        import json
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [s.strip() for s in parsed if isinstance(s, str) and _MIN_SKILL_LEN <= len(s.strip()) <= _MAX_SKILL_LEN]
    except Exception:
        pass
    skills = [s.strip() for s in re.split(r'[,;|]', raw)]
    return [s for s in skills if _MIN_SKILL_LEN <= len(s) <= _MAX_SKILL_LEN]


def aggregate_skills_from_vacantes(db: Session, days_back: int = _DAYS_BACK) -> int:
    cutoff = datetime.now(UTC).date() - timedelta(days=days_back)
    vacantes = (
        db.query(Vacante)
        .filter(Vacante.fecha_pub >= cutoff)
        .filter(Vacante.skills.isnot(None))
        .all()
    )

    counter: Counter = Counter()
    for v in vacantes:
        for skill in _parse_skills(v.skills or ""):
            counter[skill.title()] += 1

    logger.info("skills_aggregation_start", vacantes=len(vacantes), skills_unicos=len(counter))

    for skill_name, count in counter.items():
        existing = db.query(SkillEmergente).filter_by(skill=skill_name).first()
        if existing:
            existing.menciones_30d = count
        else:
            db.add(SkillEmergente(
                skill=skill_name,
                categoria="tecnica",
                menciones_30d=count,
            ))

    db.flush()
    logger.info("skills_aggregation_done", skills_actualizados=len(counter))
    return len(counter)
