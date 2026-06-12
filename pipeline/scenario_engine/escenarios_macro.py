# pipeline/scenario_engine/escenarios_macro.py
"""Trayectorias del IVA v2 bajo escenarios macro (módulo M5 del panel).

Ancla: research brief de la tesis IEX, §15 "Análisis de sensibilidad y
escenarios". Se modelan los 3 escenarios que el panel consideró cuantificables
(Continuista, Polarización-Hinton, Disruptivo moderado); Colapso del consumo y
Yampolskiy fuerte quedan fuera por diseño (el propio brief los marca como
límites de validez del marco, no como trayectorias proyectables).

El brief exige reportar RANGO mejor/peor caso, no valor puntual, y aclara que
es un "marco interpretativo estructural, no una predicción" — ese disclaimer
viaja con cada respuesta.

Mecánica v0 (determinista, parámetros documentados y revisables):
  iva(esc, h) = clamp01( iex_h × (1 − fes_ef) × (1 − fa_h) )
  - iex_h: la exposición converge hacia el techo (1.0) a una tasa g por
    escenario: iex_h = iex + (1 − iex) × g × (años/10). En Polarización, g
    escala con la rutinariedad cognitiva (TRC = D7 del IEX): el trabajo
    cognitivo rutinario es el primer blanco (H8 Hinton).
  - fa_h: la fricción de adopción decae por escenario (capacidad ≠ despliegue,
    Yampolskiy); en Disruptivo decae rápido.
  - fes_ef: en Disruptivo la protección de la elasticidad se satura
    parcialmente (factor 0.5); en los demás opera completa (Jevons).
"""
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from pipeline.db.models import Carrera
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX
from pipeline.kpi_engine.d1_iva_v2 import calcular_iva_v2

ANIO_BASE = 2026
HORIZONTES = (2030, 2035)

# Parámetros por escenario — ver docstring; revisables con evidencia.
ESCENARIOS = {
    "continuista": {
        "g": 0.20,                  # convergencia moderada de capacidades
        "fa": {2030: 0.15, 2035: 0.10},
        "fes_saturacion": 1.0,      # Jevons opera completo
    },
    "polarizacion": {
        "g": 0.20,                  # + 0.30 × (TRC/10) — se añade en runtime
        "g_trc": 0.30,
        "fa": {2030: 0.15, 2035: 0.10},
        "fes_saturacion": 1.0,
        "nota": "Empleo agregado relativamente estable pero presión salarial "
                "concentrada en tareas rutinarias (H9): el riesgo es "
                "distributivo además de ocupacional.",
    },
    "disruptivo": {
        "g": 0.50,                  # avance rápido generalizado
        "fa": {2030: 0.05, 2035: 0.02},
        "fes_saturacion": 0.5,      # demanda reprimida parcialmente saturada
    },
}

DISCLAIMER = (
    "Ilustración de sensibilidad bajo los escenarios del marco IEX (§15 del "
    "research brief): trayectorias estructurales, no predicciones. Reportar "
    "siempre el rango, no un punto."
)


@dataclass
class ProyeccionEscenario:
    escenario: str
    anio: int
    iva_proyectado: float
    nota: str | None = None


@dataclass
class EscenariosResult:
    iva_actual: float | None
    proyecciones: list[ProyeccionEscenario] = field(default_factory=list)
    rango_2030: tuple[float, float] | None = None
    rango_2035: tuple[float, float] | None = None


def _trc_promedio(carrera: Carrera, session: Session) -> float | None:
    """TRC (D7) promedio simple de las ocupaciones mapeadas, 0-10."""
    socs = [m.soc_code for m in
            session.query(CarreraSocMap).filter_by(carrera_id=carrera.id).all()]
    vals = []
    for soc in socs:
        exp = session.get(ExposicionIEX, soc)
        if exp and exp.dim_d7 is not None:
            vals.append(float(exp.dim_d7))
    return sum(vals) / len(vals) if vals else None


def proyectar_escenarios(carrera: Carrera, session: Session) -> EscenariosResult:
    """Proyecta el IVA v2 bajo los 3 escenarios. Sin datos v2 → sin proyección."""
    base = calcular_iva_v2(carrera, session)
    if base.iva_v2 is None or base.iex_norm is None:
        return EscenariosResult(iva_actual=None)

    trc = _trc_promedio(carrera, session)
    proyecciones: list[ProyeccionEscenario] = []
    for nombre, p in ESCENARIOS.items():
        g = p["g"]
        if nombre == "polarizacion" and trc is not None:
            g += p["g_trc"] * (trc / 10.0)
        for anio in HORIZONTES:
            frac = (anio - ANIO_BASE) / 10.0
            iex_h = base.iex_norm + (1.0 - base.iex_norm) * g * frac
            fes_ef = (base.fes_factor or 0.0) * p["fes_saturacion"]
            fa_h = p["fa"][anio]
            iva = max(0.0, min(1.0, iex_h * (1.0 - fes_ef) * (1.0 - fa_h)))
            proyecciones.append(ProyeccionEscenario(
                escenario=nombre, anio=anio,
                iva_proyectado=round(iva, 4),
                nota=p.get("nota"),
            ))

    def _rango(anio: int) -> tuple[float, float]:
        vals = [pr.iva_proyectado for pr in proyecciones if pr.anio == anio]
        return (min(vals), max(vals))

    return EscenariosResult(
        iva_actual=base.iva_v2,
        proyecciones=proyecciones,
        rango_2030=_rango(2030),
        rango_2035=_rango(2035),
    )
