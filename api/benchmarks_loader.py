from __future__ import annotations
from collections import Counter
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

DATA_DIR = Path(__file__).parent / "data" / "global_benchmarks"


def _load_all_yaml(
    data_dir: Path = DATA_DIR,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, dict[str, Any]]]:
    sources: dict[str, Any] = {}
    for f in sorted((data_dir / "sources").glob("*.yaml")):
        data = yaml.safe_load(f.read_text(encoding="utf-8"))
        sources[data["fuente"]["id"]] = data

    career_map: dict[str, Any] = yaml.safe_load(
        (data_dir / "career_skills_map.yaml").read_text(encoding="utf-8")
    )

    skill_index: dict[str, dict[str, Any]] = {}
    for fuente_id, source_data in sources.items():
        for hallazgo in source_data.get("hallazgos", []):
            for skill_id in hallazgo.get("skills_afectadas", []):
                if skill_id not in skill_index:
                    skill_index[skill_id] = {}
                skill_index[skill_id][fuente_id] = hallazgo

    all_career_skill_ids: set[str] = {
        s["id"]
        for c in career_map.get("carreras", [])
        for s in c.get("skills", [])
    }
    orphans = set(skill_index.keys()) - all_career_skill_ids
    if orphans:
        raise ValueError(
            f"Skill IDs huérfanos en sources YAML (no están en career_skills_map): "
            f"{sorted(orphans)}"
        )

    return sources, career_map, skill_index


@lru_cache(maxsize=1)
def load_benchmarks() -> tuple[dict[str, Any], dict[str, Any], dict[str, dict[str, Any]]]:
    return _load_all_yaml()


def compute_direction(hallazgos_by_fuente: dict[str, Any]) -> str:
    if not hallazgos_by_fuente:
        return "sin_datos"
    directions = [h["direccion"] for h in hallazgos_by_fuente.values()]
    top_dir, top_count = Counter(directions).most_common(1)[0]
    return top_dir if top_count / len(directions) >= 0.75 else "mixed"
