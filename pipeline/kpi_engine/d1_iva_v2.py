# pipeline/kpi_engine/d1_iva_v2.py
"""IVA v2 = f(IEX, FES, FA) — versión paralela del IVA, nunca sustituye a iva_v1.

Implementa el módulo M2 del análisis del panel de expertos
(docs/estrategia/analisis_panel_research_brief_2026-05.md): corrige el falso
positivo metodológico del IVA v1 (Frey-Osborne sin elasticidad sectorial)
consumiendo el IEX validado del repo oia-ee-research.

Fórmula:  iva_v2 = (IEX/10) × (1 − FES) × (1 − FA)

- IEX: exposición 0-10 por ocupación SOC (iex_v2 con compuerta de viabilidad;
  fallback iex_v1), promediada sobre los SOC de la carrera ponderando por
  carrera_soc_map.peso.
- FES: factor de elasticidad sectorial. La demanda reprimida (paradoja de
  Jevons, H7 Hinton) absorbe ganancias de productividad: E-Alta descuenta 50%
  del riesgo, E-Media 25%, E-Baja 0%. Sin elasticidad conocida → 0 (conservador).
- FA: fricción de adopción por grupo SOC mayor (tabla fa_sectorial, seed según
  docs/estrategia/propuesta_fa_sectorial_2026-06.md — regulación de ejercicio,
  sindicación/plazas, frontera bits-átomos). Fallback FA_DEFAULT=0.25 cuando
  el grupo no tiene fila; fa_fuente registra qué se usó (sectorial/mixta/
  constante). Editable por superadmin vía /admin/fa-sectorial.

A diferencia de iva_v1, NO inventa un default 0.5: si la carrera no tiene
mapeo SOC o no hay datos IEX cargados, iva_v2 es None y el consumidor decide.
"""
import logging
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from pipeline.db.models import Carrera
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX, FASectorial

logger = logging.getLogger(__name__)

FES_FACTOR = {"E-Alta": 0.50, "E-Media": 0.25, "E-Baja": 0.0}
FA_DEFAULT = 0.25


@dataclass
class IvaV2Result:
    iva_v2: float | None
    iex_norm: float | None
    fes_factor: float | None
    fa: float
    n_soc: int
    soc_codes: list[str] = field(default_factory=list)
    fa_fuente: str = "constante"   # sectorial | mixta | constante


def _fa_por_soc(soc_code: str, session: Session) -> tuple[float, bool]:
    """FA del grupo SOC mayor (2 dígitos); (FA_DEFAULT, False) si no hay fila."""
    fila = session.get(FASectorial, soc_code[:2])
    if fila and fila.fa is not None:
        return float(fila.fa), True
    return FA_DEFAULT, False


def calcular_iva_v2(carrera: Carrera, session: Session) -> IvaV2Result:
    """Calcula IVA v2 para una carrera vía su crosswalk SOC. None si sin datos."""
    mapeos = (
        session.query(CarreraSocMap)
        .filter_by(carrera_id=carrera.id)
        .all()
    )
    if not mapeos:
        logger.debug("IVA_v2 sin mapeo SOC para carrera %s", carrera.id)
        return IvaV2Result(iva_v2=None, iex_norm=None, fes_factor=None,
                           fa=FA_DEFAULT, n_soc=0)

    pesos_iex: list[tuple[float, float]] = []   # (peso, iex 0-10)
    pesos_fes: list[tuple[float, float]] = []   # (peso, factor FES)
    pesos_fa: list[tuple[float, float]] = []    # (peso, FA del grupo)
    fa_sectoriales = 0
    socs_usados: list[str] = []
    for m in mapeos:
        exp = session.get(ExposicionIEX, m.soc_code)
        if not exp:
            continue
        iex = exp.iex_v2 if exp.iex_v2 is not None else exp.iex_v1
        if iex is None:
            continue
        peso = m.peso if m.peso else 1.0
        fa_soc, es_sectorial = _fa_por_soc(m.soc_code, session)
        fa_sectoriales += int(es_sectorial)
        pesos_iex.append((peso, float(iex)))
        pesos_fes.append((peso, FES_FACTOR.get(exp.elasticidad_mx, 0.0)))
        pesos_fa.append((peso, fa_soc))
        socs_usados.append(m.soc_code)

    if not pesos_iex:
        logger.debug("IVA_v2 sin datos IEX para carrera %s", carrera.id)
        return IvaV2Result(iva_v2=None, iex_norm=None, fes_factor=None,
                           fa=FA_DEFAULT, n_soc=0)

    total = sum(p for p, _ in pesos_iex)
    iex_norm = sum(p * v for p, v in pesos_iex) / total / 10.0
    fes = sum(p * f for p, f in pesos_fes) / total
    fa = sum(p * f for p, f in pesos_fa) / total
    iva_v2 = max(0.0, min(1.0, iex_norm * (1.0 - fes) * (1.0 - fa)))

    if fa_sectoriales == len(socs_usados):
        fa_fuente = "sectorial"
    elif fa_sectoriales > 0:
        fa_fuente = "mixta"
    else:
        fa_fuente = "constante"

    return IvaV2Result(
        iva_v2=round(iva_v2, 4),
        iex_norm=round(iex_norm, 4),
        fes_factor=round(fes, 4),
        fa=round(fa, 4),
        n_soc=len(socs_usados),
        soc_codes=sorted(socs_usados),
        fa_fuente=fa_fuente,
    )
