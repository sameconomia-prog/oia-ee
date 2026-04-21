import logging
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Optional
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class StpsVacante:
    titulo: str
    empresa: Optional[str]
    sector: Optional[str]
    skills: list[str]
    salario_min: Optional[int]
    salario_max: Optional[int]
    fecha_pub: Optional[date]
    estado: Optional[str]
    nivel_educativo: Optional[str]
    experiencia_anios: Optional[int]


class StpsLoader:
    """Loads vacancies from STPS Observatorio Laboral CSV export."""

    def load_csv(self, path: Path) -> list[StpsVacante]:
        df = pd.read_csv(path, dtype=str).fillna("")
        results = []
        for _, row in df.iterrows():
            skills_raw = row.get("habilidades", "")
            skills = [s.strip() for s in skills_raw.split(",") if s.strip()]
            results.append(StpsVacante(
                titulo=row.get("titulo", ""),
                empresa=row.get("empresa") or None,
                sector=row.get("sector") or None,
                skills=skills,
                salario_min=_to_int(row.get("salario_min")),
                salario_max=_to_int(row.get("salario_max")),
                fecha_pub=_to_date(row.get("fecha_publicacion")),
                estado=row.get("estado") or None,
                nivel_educativo=row.get("nivel_educativo") or None,
                experiencia_anios=_to_int(row.get("experiencia")),
            ))
        return results


def _to_int(val) -> Optional[int]:
    try:
        return int(float(val)) if val and str(val).strip() else None
    except (ValueError, TypeError):
        return None


def _to_date(val) -> Optional[date]:
    try:
        return date.fromisoformat(str(val).strip()) if val and str(val).strip() else None
    except ValueError:
        return None
