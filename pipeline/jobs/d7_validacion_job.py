"""Job de validación del D7: persiste pares señal-noticias / vacantes OCC.

Captura semanal por sector para poder evaluar, 12 meses después, si el ISN/VDM
anticipan demanda real o solo hype mediático (alerta #4 del panel).
Diseño y criterio de lectura: docs/estrategia/diseno_validacion_d7_2026-06.md
"""
import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from pipeline.db.models import Noticia, Vacante
from pipeline.db.models_d7_validacion import D7ValidacionSnapshot
from pipeline.kpi_engine.d7_noticias import _pearson, calcular_d7

logger = logging.getLogger(__name__)

LAG_DIAS = 365      # horizonte de validación: vacantes reales 12 meses después
VENTANA_DIAS = 30   # ventana de conteo del ground truth alrededor del mes 12
MIN_PARES_SECTOR = 3


@dataclass
class D7ValidacionResult:
    sectores: int
    guardados: int
    actualizados: int


def _conteo_noticias(session: Session, desde: date) -> dict[str, int]:
    cutoff = datetime.combine(desde, time.min)
    rows = (
        session.query(Noticia.sector, func.count(Noticia.id))
        .filter(
            Noticia.sector.isnot(None),
            Noticia.fecha_pub.isnot(None),
            Noticia.fecha_pub >= cutoff,
        )
        .group_by(Noticia.sector)
        .all()
    )
    return {sector: n for sector, n in rows}


def _conteo_vacantes(session: Session, desde: date, hasta: date | None = None) -> dict[str, int]:
    q = (
        session.query(Vacante.sector, func.count(Vacante.id))
        .filter(
            Vacante.sector.isnot(None),
            Vacante.fecha_pub.isnot(None),
            Vacante.fecha_pub >= desde,
        )
    )
    if hasta is not None:
        q = q.filter(Vacante.fecha_pub <= hasta)
    return {sector: n for sector, n in q.group_by(Vacante.sector).all()}


def run_d7_validacion_snapshot(session: Session, fecha: date | None = None) -> D7ValidacionResult:
    """Congela por sector la señal mediática y el baseline de vacantes (idempotente)."""
    hoy = fecha or date.today()
    d7 = calcular_d7(session)

    noticias_7d = _conteo_noticias(session, hoy - timedelta(days=7))
    noticias_30d = _conteo_noticias(session, hoy - timedelta(days=30))
    vacantes_30d = _conteo_vacantes(session, hoy - timedelta(days=30))

    sectores = set(noticias_30d) | set(vacantes_30d)
    guardados = 0
    actualizados = 0

    for sector in sorted(sectores):
        valores = {
            "noticias_7d": noticias_7d.get(sector, 0),
            "noticias_30d": noticias_30d.get(sector, 0),
            "vacantes_30d": vacantes_30d.get(sector, 0),
            "isn_global": d7.isn,
            "vdm_global": d7.vdm,
            "d7_score_global": d7.score,
        }
        existing = (
            session.query(D7ValidacionSnapshot)
            .filter_by(fecha=hoy, sector=sector)
            .first()
        )
        if existing:
            for campo, valor in valores.items():
                setattr(existing, campo, valor)
            actualizados += 1
        else:
            session.add(D7ValidacionSnapshot(fecha=hoy, sector=sector, **valores))
            guardados += 1

    session.flush()
    logger.info(
        "d7_validacion_snapshot fecha=%s sectores=%d guardados=%d actualizados=%d",
        hoy, len(sectores), guardados, actualizados,
    )
    return D7ValidacionResult(
        sectores=len(sectores), guardados=guardados, actualizados=actualizados
    )


def evaluar_validacion_d7(session: Session, hoy: date | None = None) -> dict:
    """Evalúa los pares maduros (fecha + LAG_DIAS ≤ hoy) contra vacantes reales.

    Ground truth por snapshot: vacantes OCC del sector en
    [fecha+LAG-VENTANA, fecha+LAG]; delta = realizadas − baseline.
    Devuelve correlación Pearson(noticias_30d, delta) por sector con
    ≥ MIN_PARES_SECTOR pares y el promedio entre sectores.
    """
    hoy = hoy or date.today()
    limite = hoy - timedelta(days=LAG_DIAS)
    maduros = (
        session.query(D7ValidacionSnapshot)
        .filter(D7ValidacionSnapshot.fecha <= limite)
        .order_by(D7ValidacionSnapshot.sector, D7ValidacionSnapshot.fecha)
        .all()
    )

    pares_por_sector: dict[str, list[tuple[float, float]]] = {}
    for snap in maduros:
        objetivo = snap.fecha + timedelta(days=LAG_DIAS)
        realizadas = _conteo_vacantes(
            session, objetivo - timedelta(days=VENTANA_DIAS), objetivo
        ).get(snap.sector, 0)
        delta = realizadas - snap.vacantes_30d
        pares_por_sector.setdefault(snap.sector, []).append(
            (float(snap.noticias_30d), float(delta))
        )

    sectores_out = []
    correlaciones = []
    pares_totales = 0
    for sector, pares in sorted(pares_por_sector.items()):
        pares_totales += len(pares)
        if len(pares) < MIN_PARES_SECTOR:
            continue
        corr = _pearson([p[0] for p in pares], [p[1] for p in pares])
        sectores_out.append(
            {"sector": sector, "n_pares": len(pares), "correlacion": round(corr, 4)}
        )
        correlaciones.append(corr)

    return {
        "fecha_evaluacion": hoy.isoformat(),
        "pares_totales": pares_totales,
        "sectores": sectores_out,
        "correlacion_promedio": (
            round(sum(correlaciones) / len(correlaciones), 4) if correlaciones else None
        ),
    }
