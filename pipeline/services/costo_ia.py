# pipeline/services/costo_ia.py
"""Comparativo coste IA vs humano por ocupación SOC (módulo M3 del panel).

Es un cálculo de PRODUCTO sobre insumos públicos — no toca la metodología IEX
(la dimensión D6 "diferencial de coste" del índice ya viene del repo hermano;
este ratio es la versión monetaria accionable, complementaria y auditable).

Insumos:
  - Salario humano: ingreso mensual mediano ENOE por ocupación
    (tesis.db::ocupaciones_mx, repo hermano vía IEX_DATA_DIR).
  - Coste IA: pricing público de Anthropic para el modelo de referencia.

Supuestos (versionados en cada fila, columna `supuestos`):
  - Una hora de trabajo cognitivo humano equivale a procesar ~200k tokens de
    entrada + 50k de salida (lectura de contexto + redacción, perfil
    "drop-in"). Supuesto inicial grueso — afinar con mediciones reales.
  - Jornada de 160 h/mes para convertir salario mensual a hora.
  - TODO: FX MXN/USD fijo (env IEX_FX_MXN_USD, default 18.5) — sustituir por
    serie Banxico SF43718 cuando se automatice el refresco mensual.
"""
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import structlog
from sqlalchemy.orm import Session

from pipeline.db.models_iex import CostoIAOcupacion
from pipeline.loaders.iex_loader import resolve_data_dir

logger = structlog.get_logger()

# Pricing público Anthropic (USD por millón de tokens), cache 2026-05-26.
MODELO_REF = "claude-sonnet-4-6"
USD_INPUT_MTOK = 3.0
USD_OUTPUT_MTOK = 15.0

TOKENS_INPUT_HORA = 200_000
TOKENS_OUTPUT_HORA = 50_000
HORAS_MES = 160.0


def _fx_mxn_usd() -> float:
    return float(os.getenv("IEX_FX_MXN_USD", "18.5"))


def costo_ia_hora_mxn() -> float:
    """Coste estimado de una hora cognitiva equivalente con el modelo de referencia."""
    usd = (TOKENS_INPUT_HORA / 1e6) * USD_INPUT_MTOK + \
          (TOKENS_OUTPUT_HORA / 1e6) * USD_OUTPUT_MTOK
    return usd * _fx_mxn_usd()


def _salarios_enoe(data_dir: str | None) -> dict[str, float]:
    """Lee ingreso mensual mediano por SOC de tesis.db::ocupaciones_mx."""
    base = resolve_data_dir(data_dir)
    path = Path(base) / "db" / "tesis.db"
    if not path.is_file():
        logger.warning("costo_ia_sin_tesis_db", path=str(path))
        return {}
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        rows = con.execute(
            "SELECT soc_code, ingreso_mensual_mediano_mxn FROM ocupaciones_mx"
        ).fetchall()
    except sqlite3.OperationalError as e:
        logger.warning("costo_ia_sin_ocupaciones_mx", error=str(e))
        return {}
    finally:
        con.close()
    return {soc: float(ing) for soc, ing in rows if ing is not None and ing > 0}


def calcular_costos_ia(session: Session, data_dir: str | None = None) -> dict:
    """Upsert idempotente de costo_ia_ocupacion para los SOC con salario ENOE."""
    salarios = _salarios_enoe(data_dir)
    ia_hora = round(costo_ia_hora_mxn(), 2)
    supuestos = json.dumps({
        "tokens_input_hora": TOKENS_INPUT_HORA,
        "tokens_output_hora": TOKENS_OUTPUT_HORA,
        "usd_input_mtok": USD_INPUT_MTOK,
        "usd_output_mtok": USD_OUTPUT_MTOK,
        "fx_mxn_usd": _fx_mxn_usd(),
        "horas_mes": HORAS_MES,
        "pricing_cache": "2026-05-26",
    }, sort_keys=True)

    procesados = 0
    for soc, salario_mes in salarios.items():
        salario_hora = round(salario_mes / HORAS_MES, 2)
        ratio = round(ia_hora / salario_hora, 4) if salario_hora else None
        row = session.get(CostoIAOcupacion, soc)
        if not row:
            row = CostoIAOcupacion(soc_code=soc)
            session.add(row)
        row.salario_mes_mxn = salario_mes
        row.salario_hora_mxn = salario_hora
        row.costo_ia_hora_mxn = ia_hora
        row.ratio_costo = ratio
        row.modelo_ref = MODELO_REF
        row.supuestos = supuestos
        row.fecha_calculo = datetime.now(timezone.utc)
        procesados += 1

    session.flush()
    result = {"costos_procesados": procesados, "costo_ia_hora_mxn": ia_hora}
    logger.info("costo_ia_complete", **result)
    return result
