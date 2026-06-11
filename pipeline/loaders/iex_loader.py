# pipeline/loaders/iex_loader.py
"""Carga los datasets IEX publicados por el repo hermano oia-ee-research.

Regla de oro del puente ciencia→producto: la metodología se decide en
oia-ee-research; esta plataforma CONSUME sus datasets versionados y nunca
recalcula el IEX. Esquemas documentados en oia-ee-research/docs/diccionario_datos.md.

Fuentes (relativas a IEX_DATA_DIR, default ~/Documents/oia-ee-research):
  - outputs/iex_ocupacion.csv        → iex_v1, titulo
  - db/tesis.db :: iex_ocupacion_v2  → iex_v2, tipo (v2, compuerta de viabilidad)
  - docs/elasticidad_mx.csv          → elasticidad_mx (E-Alta/E-Media/E-Baja)
  - outputs/exposicion_baseline.csv  → beta_eloundou (beta_ponderada), uso_aei_pct
"""
import csv
import json
import os
import sqlite3
from datetime import date, datetime, timezone
from pathlib import Path

import structlog
from sqlalchemy.orm import Session

from pipeline.db.models import Carrera
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX

logger = structlog.get_logger()

DEFAULT_DATA_DIR = "~/Documents/oia-ee-research"
ELASTICIDADES_VALIDAS = {"E-Alta", "E-Media", "E-Baja"}

_CSV_IEX = "outputs/iex_ocupacion.csv"
_CSV_BASELINE = "outputs/exposicion_baseline.csv"
_CSV_ELASTICIDAD = "docs/elasticidad_mx.csv"
_CSV_DIMENSIONES = "outputs/iex_dimensiones_ocupacion.csv"   # opcional
_DB_TESIS = "db/tesis.db"

_DIM_COLS = [f"dim_d{i}" for i in range(1, 8)]

_REQUIRED_COLS = {
    _CSV_IEX: {"soc_code", "iex", "titulo_es"},
    _CSV_BASELINE: {"soc_code", "beta_ponderada", "uso_aei_total_pct"},
    _CSV_ELASTICIDAD: {"soc_code", "elasticidad_mx"},
    _CSV_DIMENSIONES: {"soc_code", *_DIM_COLS},
}


class IexDatasetError(ValueError):
    """Dataset del repo hermano ausente o con esquema inválido."""


def resolve_data_dir(data_dir: str | None = None) -> Path:
    """Resuelve el directorio de datos: argumento > env IEX_DATA_DIR > default."""
    raw = data_dir or os.getenv("IEX_DATA_DIR") or DEFAULT_DATA_DIR
    path = Path(raw).expanduser()
    if not path.is_dir():
        raise IexDatasetError(f"IEX_DATA_DIR no existe: {path}")
    return path


def _read_csv(base: Path, rel: str) -> list[dict]:
    path = base / rel
    if not path.is_file():
        raise IexDatasetError(f"Dataset faltante: {path}")
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        missing = _REQUIRED_COLS[rel] - set(reader.fieldnames or [])
        if missing:
            raise IexDatasetError(
                f"{rel}: columnas faltantes {sorted(missing)} "
                f"(ver diccionario_datos.md del repo hermano)"
            )
        return list(reader)


def _read_iex_v2(base: Path) -> dict[str, dict]:
    """Lee iex_ocupacion_v2 (v2 con compuerta de viabilidad) de db/tesis.db."""
    path = base / _DB_TESIS
    if not path.is_file():
        raise IexDatasetError(f"Dataset faltante: {path}")
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        cur = con.execute("SELECT soc_code, iex_v2, tipo_v2 FROM iex_ocupacion_v2")
        rows = cur.fetchall()
    except sqlite3.OperationalError as e:
        raise IexDatasetError(f"tesis.db sin tabla iex_ocupacion_v2 legible: {e}") from e
    finally:
        con.close()
    return {r[0]: {"iex_v2": r[1], "tipo": r[2]} for r in rows}


def _float(value, campo: str, soc: str) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        raise IexDatasetError(f"{campo} no numérico para {soc}: {value!r}")


def fetch_iex_records(data_dir: str | None = None) -> list[dict]:
    """Lee y fusiona los 4 datasets por soc_code. Valida esquema y rangos.

    fecha_dataset = fecha de modificación más reciente de las fuentes (proxy de
    versión del dataset hasta que el repo hermano publique un manifiesto).
    """
    base = resolve_data_dir(data_dir)

    iex_rows = _read_csv(base, _CSV_IEX)
    baseline = {r["soc_code"]: r for r in _read_csv(base, _CSV_BASELINE)}
    elasticidad = {r["soc_code"]: r["elasticidad_mx"].strip()
                   for r in _read_csv(base, _CSV_ELASTICIDAD)}
    v2 = _read_iex_v2(base)

    # Dimensiones D1-D7 por ocupación: fuente OPCIONAL (export descriptivo del
    # repo hermano). Si el archivo no existe, las columnas quedan NULL.
    dimensiones: dict[str, dict] = {}
    if (base / _CSV_DIMENSIONES).is_file():
        dimensiones = {r["soc_code"]: r for r in _read_csv(base, _CSV_DIMENSIONES)}
    else:
        logger.warning("iex_dimensiones_no_disponibles", archivo=_CSV_DIMENSIONES)

    invalidas = set(elasticidad.values()) - ELASTICIDADES_VALIDAS
    if invalidas:
        raise IexDatasetError(f"elasticidad_mx con valores inválidos: {sorted(invalidas)}")

    mtimes = [
        (base / rel).stat().st_mtime
        for rel in (_CSV_IEX, _CSV_BASELINE, _CSV_ELASTICIDAD, _DB_TESIS)
    ]
    fecha_dataset = date.fromtimestamp(max(mtimes))

    records = []
    for row in iex_rows:
        soc = row["soc_code"].strip()
        iex_v1 = _float(row["iex"], "iex", soc)
        if iex_v1 is None or not 0.0 <= iex_v1 <= 10.0:
            raise IexDatasetError(f"iex fuera de rango [0,10] para {soc}: {iex_v1}")
        base_row = baseline.get(soc, {})
        v2_row = v2.get(soc, {})
        dim_row = dimensiones.get(soc, {})
        records.append({
            "soc_code": soc,
            "titulo": row.get("titulo_es"),
            "iex_v1": iex_v1,
            "iex_v2": _float(v2_row.get("iex_v2"), "iex_v2", soc),
            "tipo": v2_row.get("tipo") or row.get("tipo"),
            "elasticidad_mx": elasticidad.get(soc),
            "beta_eloundou": _float(base_row.get("beta_ponderada"), "beta_ponderada", soc),
            "uso_aei_pct": _float(base_row.get("uso_aei_total_pct"), "uso_aei_total_pct", soc),
            "fecha_dataset": fecha_dataset,
            **{col: _float(dim_row.get(col), col, soc) for col in _DIM_COLS},
        })
    logger.info("iex_fetch_ok", registros=len(records), data_dir=str(base),
                fecha_dataset=str(fecha_dataset))
    return records


def load_exposicion_iex(session: Session, data_dir: str | None = None) -> dict:
    """Upsert idempotente de los datasets IEX en exposicion_iex.

    Retorna {"procesados": N, "insertados": N, "actualizados": N}.
    """
    records = fetch_iex_records(data_dir)
    insertados = actualizados = 0
    for r in records:
        existing = session.get(ExposicionIEX, r["soc_code"])
        if existing:
            for campo, valor in r.items():
                setattr(existing, campo, valor)
            existing.fecha_carga = datetime.now(timezone.utc)
            actualizados += 1
        else:
            session.add(ExposicionIEX(**r))
            insertados += 1
    session.flush()
    result = {"procesados": len(records), "insertados": insertados,
              "actualizados": actualizados}
    logger.info("iex_load_complete", **result)
    return result


def seed_carrera_soc_map(session: Session) -> dict:
    """Siembra el crosswalk carrera→SOC truncando onet_codes_relacionados.

    O*NET 8 dígitos ('15-1252.00') → SOC 6 dígitos ('15-1252'). Solo añade pares
    cuyo SOC exista en exposicion_iex y que no estén ya mapeados — nunca pisa
    ediciones manuales del superadmin. Idempotente.
    """
    socs_disponibles = {s for (s,) in session.query(ExposicionIEX.soc_code).all()}
    insertados = carreras_mapeadas = 0
    for carrera in session.query(Carrera).all():
        try:
            codes = json.loads(carrera.onet_codes_relacionados or "[]")
        except (json.JSONDecodeError, TypeError):
            continue
        socs = {c.split(".")[0].strip() for c in codes if c} & socs_disponibles
        if not socs:
            continue
        carreras_mapeadas += 1
        existentes = {
            m.soc_code for m in session.query(CarreraSocMap)
            .filter_by(carrera_id=carrera.id).all()
        }
        for soc in sorted(socs - existentes):
            session.add(CarreraSocMap(
                carrera_id=carrera.id, soc_code=soc,
                es_aproximacion=True, fuente="seed_onet_truncado",
            ))
            insertados += 1
    session.flush()
    result = {"carreras_mapeadas": carreras_mapeadas, "insertados": insertados}
    logger.info("iex_seed_crosswalk_complete", **result)
    return result
