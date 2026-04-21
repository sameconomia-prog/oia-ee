import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class AnuiesRecord:
    """One row from ANUIES = IES + carrera + ciclo."""
    clave_sep: str
    nombre_ies: str
    tipo: str
    subsistema: Optional[str]
    estado: str
    matricula_total: Optional[int]
    nombre_carrera: str
    area_conocimiento: Optional[str]
    nivel: str
    matricula: Optional[int]
    egresados: Optional[int]
    ciclo: str


class AnuiesLoader:
    """Loads the annual ANUIES CSV (Formato 911 / Estadísticas de Educación Superior)."""

    def load_csv(self, path: Path) -> list[AnuiesRecord]:
        df = pd.read_csv(path, dtype=str).fillna("")
        results = []
        for _, row in df.iterrows():
            results.append(AnuiesRecord(
                clave_sep=row.get("clave_sep", ""),
                nombre_ies=row.get("nombre_ies", ""),
                tipo=row.get("tipo", ""),
                subsistema=row.get("subsistema") or None,
                estado=row.get("estado", ""),
                matricula_total=_to_int(row.get("matricula_total")),
                nombre_carrera=row.get("nombre_carrera", ""),
                area_conocimiento=row.get("area_conocimiento") or None,
                nivel=row.get("nivel", "licenciatura"),
                matricula=_to_int(row.get("matricula")),
                egresados=_to_int(row.get("egresados")),
                ciclo=row.get("ciclo", ""),
            ))
        return results


def _to_int(val) -> Optional[int]:
    try:
        return int(float(val)) if val and str(val).strip() else None
    except (ValueError, TypeError):
        return None
