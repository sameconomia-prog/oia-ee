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
  - FX MXN/USD: serie Banxico SF43718 (FIX) si hay BANXICO_TOKEN; override
    manual con IEX_FX_MXN_USD; fallback constante 18.5.
"""
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import httpx
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

FX_DEFAULT = 18.5
_BANXICO_URL = ("https://www.banxico.org.mx/SieAPIRest/service/v1/"
                "series/SF43718/datos/oportuno")


def _fx_banxico(token: str) -> float | None:
    """Último FIX publicado (serie SF43718) vía API SIE de Banxico."""
    try:
        resp = httpx.get(_BANXICO_URL, headers={"Bmx-Token": token}, timeout=10.0)
        resp.raise_for_status()
        dato = resp.json()["bmx"]["series"][0]["datos"][0]["dato"]
        return float(dato)
    except Exception as e:
        logger.warning("fx_banxico_error", error=str(e))
        return None


def _fx_mxn_usd() -> tuple[float, str]:
    """Resuelve el FX y su fuente: override manual > Banxico > constante."""
    override = os.getenv("IEX_FX_MXN_USD")
    if override:
        return float(override), "env_IEX_FX_MXN_USD"
    token = os.getenv("BANXICO_TOKEN")
    if token:
        fx = _fx_banxico(token)
        if fx:
            return fx, "banxico_SF43718"
    return FX_DEFAULT, "default_constante"


def costo_ia_hora_mxn(fx: float | None = None) -> float:
    """Coste estimado de una hora cognitiva equivalente con el modelo de referencia."""
    if fx is None:
        fx, _ = _fx_mxn_usd()
    usd = (TOKENS_INPUT_HORA / 1e6) * USD_INPUT_MTOK + \
          (TOKENS_OUTPUT_HORA / 1e6) * USD_OUTPUT_MTOK
    return usd * fx


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
    fx, fx_fuente = _fx_mxn_usd()
    ia_hora = round(costo_ia_hora_mxn(fx), 2)
    supuestos = json.dumps({
        "tokens_input_hora": TOKENS_INPUT_HORA,
        "tokens_output_hora": TOKENS_OUTPUT_HORA,
        "usd_input_mtok": USD_INPUT_MTOK,
        "usd_output_mtok": USD_OUTPUT_MTOK,
        "fx_mxn_usd": fx,
        "fx_fuente": fx_fuente,
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
