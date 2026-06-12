from __future__ import annotations
from datetime import date
from functools import lru_cache
from pathlib import Path

import yaml

_TAXONOMY_PATH = Path(__file__).parent.parent / "data" / "skill_ia_taxonomy.yaml"
_SCORE_MAP = {"automated": 0.9, "augmented": 0.5, "resilient": 0.1}

# Cadencia trimestral sugerida por el panel (alerta #7): pasado este umbral
# el endpoint /capability-frontier marca revision_recomendada=True.
REVISION_DIAS = 90


@lru_cache(maxsize=1)
def _load_raw() -> dict:
    with open(_TAXONOMY_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


@lru_cache(maxsize=1)
def _load() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for label, skills in _load_raw().items():
        if not isinstance(skills, list):
            continue  # claves no-nivel (p. ej. meta)
        for skill in skills:
            mapping[skill.lower().strip()] = label
    return mapping


def get_ia_label(skill: str) -> str:
    """Retorna 'automated' | 'augmented' | 'resilient' | 'unknown'."""
    return _load().get(skill.lower().strip(), "unknown")


def get_ia_score(skill: str) -> float:
    """Retorna score IA 0.0–1.0. Mayor = más automatizable."""
    label = get_ia_label(skill)
    return _SCORE_MAP.get(label, 0.5)


def get_taxonomy_meta() -> dict:
    """Versión de la taxonomía y frontera de capacidades contra la que se evaluó."""
    meta = _load_raw().get("meta") or {}
    frontier = meta.get("capability_frontier") or {}
    fecha = frontier.get("fecha_evaluacion")
    return {
        "version": meta.get("version", "unversioned"),
        "modelo_referencia": frontier.get("modelo_referencia"),
        "fecha_evaluacion": str(fecha) if fecha else None,
    }


def dias_desde_evaluacion(hoy: date | None = None) -> int | None:
    """Días transcurridos desde la última evaluación de la taxonomía."""
    fecha = get_taxonomy_meta()["fecha_evaluacion"]
    if not fecha:
        return None
    return ((hoy or date.today()) - date.fromisoformat(fecha)).days


def build_capability_frontier_info(hoy: date | None = None) -> dict:
    """Payload de GET /capability-frontier: metadatos + conteos + staleness."""
    raw = _load_raw()
    meta = raw.get("meta") or {}
    counts = {
        label: len(skills) for label, skills in raw.items() if isinstance(skills, list)
    }
    dias = dias_desde_evaluacion(hoy)
    return {
        **get_taxonomy_meta(),
        "politica_revision": meta.get("politica_revision"),
        "fuentes": meta.get("fuentes", []),
        "historial": meta.get("historial", []),
        "skills_por_nivel": counts,
        "total_skills": sum(counts.values()),
        "dias_desde_evaluacion": dias,
        "revision_recomendada": dias is None or dias >= REVISION_DIAS,
    }
