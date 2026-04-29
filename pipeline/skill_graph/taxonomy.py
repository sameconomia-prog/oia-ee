from __future__ import annotations
from functools import lru_cache
from pathlib import Path

import yaml

_TAXONOMY_PATH = Path(__file__).parent.parent / "data" / "skill_ia_taxonomy.yaml"
_SCORE_MAP = {"automated": 0.9, "augmented": 0.5, "resilient": 0.1}


@lru_cache(maxsize=1)
def _load() -> dict[str, str]:
    with open(_TAXONOMY_PATH, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    mapping: dict[str, str] = {}
    for label, skills in data.items():
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
