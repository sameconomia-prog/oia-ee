import json
import logging
import re
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import IES, Carrera, CarreraIES
from pipeline.loaders.anuies_loader import AnuiesRecord

logger = logging.getLogger(__name__)


@dataclass
class AnuiesIngestResult:
    ies_creadas: int
    ies_actualizadas: int
    carreras_creadas: int
    carrera_ies_creadas: int
    carrera_ies_actualizadas: int


def _normalizar_nombre(nombre: str) -> str:
    """Lowercase + colapsa espacios. Usado como clave de dedup de carreras."""
    return re.sub(r"\s+", " ", nombre.lower().strip())


def ingest_anuies(records: list[AnuiesRecord], session: Session) -> AnuiesIngestResult:
    """Persiste registros ANUIES en IES, Carrera y CarreraIES. Upsert por claves naturales."""
    ies_creadas = ies_actualizadas = 0
    carreras_creadas = 0
    cie_creadas = cie_actualizadas = 0

    ies_cache: dict[str, str] = {}   # clave_sep → ies.id
    carrera_cache: dict[str, str] = {}  # nombre_norm → carrera.id

    for rec in records:
        # ── IES ──────────────────────────────────────────────────────────────
        if rec.clave_sep not in ies_cache:
            ies = session.query(IES).filter_by(clave_sep=rec.clave_sep).first()
            if ies is None:
                ies = IES(
                    clave_sep=rec.clave_sep,
                    nombre=rec.nombre_ies,
                    tipo=rec.tipo,
                    subsistema=rec.subsistema,
                    estado=rec.estado,
                    matricula_total=rec.matricula_total,
                )
                session.add(ies)
                session.flush()
                ies_creadas += 1
            else:
                if rec.matricula_total:
                    ies.matricula_total = rec.matricula_total
                ies_actualizadas += 1
            ies_cache[rec.clave_sep] = ies.id

        ies_id = ies_cache[rec.clave_sep]

        # ── Carrera ──────────────────────────────────────────────────────────
        norm = _normalizar_nombre(rec.nombre_carrera)
        if norm not in carrera_cache:
            carrera = session.query(Carrera).filter_by(nombre_norm=norm).first()
            if carrera is None:
                carrera = Carrera(
                    nombre_norm=norm,
                    area_conocimiento=rec.area_conocimiento,
                    nivel=rec.nivel,
                )
                session.add(carrera)
                session.flush()
                carreras_creadas += 1
            carrera_cache[norm] = carrera.id

        carrera_id = carrera_cache[norm]

        # ── CarreraIES ────────────────────────────────────────────────────────
        cie = (
            session.query(CarreraIES)
            .filter_by(carrera_id=carrera_id, ies_id=ies_id, ciclo=rec.ciclo)
            .first()
        )
        if cie is None:
            cie = CarreraIES(
                carrera_id=carrera_id,
                ies_id=ies_id,
                ciclo=rec.ciclo,
                matricula=rec.matricula,
                egresados=rec.egresados,
            )
            session.add(cie)
            cie_creadas += 1
        else:
            cie.matricula = rec.matricula
            cie.egresados = rec.egresados
            cie_actualizadas += 1

    session.flush()
    logger.info(
        "anuies_ingest: ies +%d ~%d | carreras +%d | cie +%d ~%d",
        ies_creadas, ies_actualizadas, carreras_creadas, cie_creadas, cie_actualizadas,
    )
    return AnuiesIngestResult(
        ies_creadas=ies_creadas,
        ies_actualizadas=ies_actualizadas,
        carreras_creadas=carreras_creadas,
        carrera_ies_creadas=cie_creadas,
        carrera_ies_actualizadas=cie_actualizadas,
    )
