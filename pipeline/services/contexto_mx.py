# pipeline/services/contexto_mx.py
"""Perfil del empleo MX por carrera + lectura de equidad (módulos M4/M7 v0).

Agrega las variables distributivas de las ocupaciones mapeadas (ENOE 2026-T1,
dataset validado en las fichas distributivas de la tesis) al nivel carrera,
ponderando por el peso del crosswalk. Sobre el agregado aplica REGLAS de
equidad transparentes (recomendación del sociólogo del panel, H9 Hinton):
el riesgo no es solo cuánto empleo, sino para quién.

Umbrales (documentados, revisables):
  feminizada        → pct_mujeres ≥ 60
  informalidad_alta → pct_informalidad ≥ 40  (sin colchón formal: la
                      transición golpea sin prestaciones ni recolocación)
  base_rural        → pct_rural ≥ 25         (recolocación geográfica difícil)
Alerta distributiva (H9): riesgo ajustado (IVA v2) ≥ 0.35 y al menos un flag.
"""
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from pipeline.db.models import Carrera
from pipeline.db.models_iex import CarreraSocMap, ContextoOcupacionMX
from pipeline.kpi_engine.d1_iva_v2 import calcular_iva_v2

UMBRAL_FEMINIZADA = 60.0
UMBRAL_INFORMALIDAD = 40.0
UMBRAL_RURAL = 25.0
UMBRAL_RIESGO = 0.35

FUENTE = "ENOE 2026-T1 (SDEM∩COE1), vía tesis IEX"


@dataclass
class ContextoMXResult:
    n_soc: int
    empleo_mx: int | None = None            # suma de ocupaciones mapeadas
    ingreso_mensual_mxn: float | None = None  # promedio ponderado
    pct_informalidad: float | None = None
    pct_mujeres: float | None = None
    escolaridad_anios: float | None = None
    pct_rural: float | None = None
    flags: list[str] = field(default_factory=list)
    alerta_distributiva: bool = False
    nota: str | None = None


def contexto_carrera(carrera: Carrera, session: Session) -> ContextoMXResult:
    mapeos = session.query(CarreraSocMap).filter_by(carrera_id=carrera.id).all()
    filas = []
    for m in mapeos:
        ctx = session.get(ContextoOcupacionMX, m.soc_code)
        if ctx:
            filas.append((m.peso if m.peso else 1.0, ctx))
    if not filas:
        return ContextoMXResult(n_soc=0)

    total = sum(p for p, _ in filas)

    def _pond(attr: str) -> float | None:
        vals = [(p, getattr(c, attr)) for p, c in filas if getattr(c, attr) is not None]
        if not vals:
            return None
        return round(sum(p * v for p, v in vals) / sum(p for p, _ in vals), 1)

    empleo = sum(c.empleo_mx for _, c in filas if c.empleo_mx) or None
    informalidad = _pond("pct_informalidad")
    mujeres = _pond("pct_mujeres")
    rural = _pond("pct_rural")

    flags = []
    if mujeres is not None and mujeres >= UMBRAL_FEMINIZADA:
        flags.append("feminizada")
    if informalidad is not None and informalidad >= UMBRAL_INFORMALIDAD:
        flags.append("informalidad_alta")
    if rural is not None and rural >= UMBRAL_RURAL:
        flags.append("base_rural")

    v2 = calcular_iva_v2(carrera, session)
    alerta = bool(flags) and v2.iva_v2 is not None and v2.iva_v2 >= UMBRAL_RIESGO
    nota = None
    if alerta:
        quien = {"feminizada": "una matrícula mayoritariamente femenina",
                 "informalidad_alta": "una base laboral con alta informalidad (sin colchón de prestaciones)",
                 "base_rural": "una base laboral con peso rural (recolocación difícil)"}
        partes = [quien[f] for f in flags]
        nota = ("La exposición de esta carrera recae sobre " + " y ".join(partes) +
                ": aun con empleo agregado estable, la transición concentra costos "
                "en estos grupos (lectura distributiva H9).")

    return ContextoMXResult(
        n_soc=len(filas),
        empleo_mx=empleo,
        ingreso_mensual_mxn=_pond("ingreso_mensual_mxn"),
        pct_informalidad=informalidad,
        pct_mujeres=mujeres,
        escolaridad_anios=_pond("escolaridad_anios"),
        pct_rural=rural,
        flags=flags,
        alerta_distributiva=alerta,
        nota=nota,
    )
