# pipeline/services/recomendacion.py
"""Recomendación accionable por carrera (módulo M6 / D8 del panel de expertos).

Motor de REGLAS transparentes — no LLM — para que la salida sea auditable y
estable. Combina el riesgo de automatización (IVA v2 si hay datos IEX;
fallback IVA v1 con confianza degradada) con la elasticidad sectorial
dominante y D2 (oportunidades) para emitir una acción priorizada con
horizonte. Es orientación de cartera, no un dictamen: el disclaimer viaja
con la respuesta y la UI enlaza al estudio de pertinencia.

Umbrales (documentados, revisables):
  riesgo ≥ 0.50  → rediseño profundo; si la elasticidad dominante es E-Baja
                   (sin demanda reprimida que absorba productividad) se
                   escala a evaluar fusión/cierre.
  0.25–0.50      → actualización curricular dirigida.
  < 0.25         → mantener con monitoreo.
"""
from collections import Counter
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from pipeline.db.models import Carrera
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX
from pipeline.kpi_engine.d1_iva_v2 import calcular_iva_v2
from pipeline.kpi_engine.d1_obsolescencia import calcular_iva

RIESGO_ALTO = 0.50
RIESGO_MEDIO = 0.25

DISCLAIMER = (
    "Recomendación orientativa generada por reglas sobre indicadores "
    "agregados; no sustituye un estudio de pertinencia institucional."
)


@dataclass
class RecomendacionResult:
    accion: str                 # mantener | actualizar | redisenar | evaluar_fusion_cierre | sin_datos
    horizonte: str
    confianza: str              # alta | media | baja
    riesgo_base: float | None
    fuente_riesgo: str          # iva_v2 | iva_v1 | ninguna
    justificacion: str
    acciones: list[str] = field(default_factory=list)


def _elasticidad_dominante(carrera: Carrera, session: Session) -> str | None:
    socs = [m.soc_code for m in
            session.query(CarreraSocMap).filter_by(carrera_id=carrera.id).all()]
    elasticidades = []
    for soc in socs:
        exp = session.get(ExposicionIEX, soc)
        if exp and exp.elasticidad_mx:
            elasticidades.append(exp.elasticidad_mx)
    if not elasticidades:
        return None
    return Counter(elasticidades).most_common(1)[0][0]


def recomendar(carrera: Carrera, session: Session) -> RecomendacionResult:
    v2 = calcular_iva_v2(carrera, session)
    elasticidad = _elasticidad_dominante(carrera, session)

    if v2.iva_v2 is not None:
        riesgo, fuente, confianza = v2.iva_v2, "iva_v2", "alta"
    else:
        import json
        try:
            tiene_codes = bool(json.loads(carrera.onet_codes_relacionados or "[]"))
        except (json.JSONDecodeError, TypeError):
            tiene_codes = False
        if not tiene_codes:
            return RecomendacionResult(
                accion="sin_datos", horizonte="—", confianza="baja",
                riesgo_base=None, fuente_riesgo="ninguna",
                justificacion="La carrera no tiene mapeo ocupacional (O*NET/SOC); "
                              "no es posible estimar el riesgo con evidencia.",
                acciones=["Completar el mapeo carrera→ocupación con apoyo del superadmin",
                          "Solicitar estudio de pertinencia para levantar línea base",
                          "Reevaluar al siguiente refresco de datos IEX"],
            )
        riesgo, fuente, confianza = calcular_iva(carrera, session), "iva_v1", "media"

    if riesgo >= RIESGO_ALTO and elasticidad == "E-Baja":
        return RecomendacionResult(
            accion="evaluar_fusion_cierre", horizonte="12-24 meses",
            confianza=confianza, riesgo_base=round(riesgo, 4), fuente_riesgo=fuente,
            justificacion="Exposición alta a IA en un sector sin demanda reprimida "
                          "(elasticidad E-Baja): las ganancias de productividad no "
                          "se traducen en más empleo.",
            acciones=["Auditoría curricular profunda con horizonte de decisión a 12 meses",
                      "Diseñar plan de transición/salvaguarda para la matrícula activa",
                      "Explorar fusión con un programa adyacente de elasticidad alta"],
        )
    if riesgo >= RIESGO_ALTO:
        return RecomendacionResult(
            accion="redisenar", horizonte="18-36 meses",
            confianza=confianza, riesgo_base=round(riesgo, 4), fuente_riesgo=fuente,
            justificacion="Exposición alta a IA, pero el sector puede absorber "
                          "productividad vía demanda latente: el rediseño hacia "
                          "tareas complementarias preserva la pertinencia.",
            acciones=["Reorientar el plan hacia supervisión, criterio y trato humano "
                      "(tareas complementarias a IA)",
                      "Incorporar las skills en demanda del benchmark de la carrera",
                      "Establecer convenios con empleadores del segmento en expansión"],
        )
    if riesgo >= RIESGO_MEDIO:
        return RecomendacionResult(
            accion="actualizar", horizonte="24 meses",
            confianza=confianza, riesgo_base=round(riesgo, 4), fuente_riesgo=fuente,
            justificacion="Exposición moderada: el núcleo del programa sigue vigente "
                          "pero hay tareas en transición.",
            acciones=["Actualizar el plan con módulos de IA aplicada al campo",
                      "Monitoreo semestral del KPI D1 y del benchmark de skills",
                      "Reforzar prácticas profesionales en entornos con adopción de IA"],
        )
    return RecomendacionResult(
        accion="mantener", horizonte="36-60 meses",
        confianza=confianza, riesgo_base=round(riesgo, 4), fuente_riesgo=fuente,
        justificacion="Exposición baja: el perfil de tareas es poco automatizable "
                      "con la frontera actual de capacidades.",
        acciones=["Monitoreo anual del indicador y del benchmark",
                  "Comunicar la resiliencia del programa como diferenciador",
                  "Vigilar cambios de frontera (re-scoring del IEX) que muevan el perfil"],
    )
