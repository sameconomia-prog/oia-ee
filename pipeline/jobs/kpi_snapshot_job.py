import logging
from dataclasses import dataclass
from datetime import date
from sqlalchemy.orm import Session
from pipeline.db.models import CarreraIES, KpiHistorico
from pipeline.kpi_engine.kpi_runner import run_kpis

logger = logging.getLogger(__name__)

KPI_FIELDS = [
    ('d1_score', lambda r: r.d1_obsolescencia.score),
    ('d2_score', lambda r: r.d2_oportunidades.score),
    ('d3_score', lambda r: r.d3_mercado.score),
    ('d6_score', lambda r: r.d6_estudiantil.score),
]


@dataclass
class SnapshotResult:
    carreras_procesadas: int
    kpis_guardados: int
    kpis_actualizados: int


def run_kpi_snapshot(session: Session, fecha: date | None = None) -> SnapshotResult:
    """Calcula KPIs D1–D3–D6 para todas las carreras y los persiste en kpi_historico."""
    hoy = fecha or date.today()
    carrera_ids = [r[0] for r in session.query(CarreraIES.carrera_id).distinct().all()]

    guardados = 0
    actualizados = 0

    for carrera_id in carrera_ids:
        result = run_kpis(carrera_id, session)
        if result is None:
            continue
        for kpi_nombre, extractor in KPI_FIELDS:
            valor = float(extractor(result))
            existing = (
                session.query(KpiHistorico)
                .filter_by(
                    entidad_tipo='carrera',
                    entidad_id=carrera_id,
                    kpi_nombre=kpi_nombre,
                    fecha=hoy,
                )
                .first()
            )
            if existing:
                existing.valor = valor
                actualizados += 1
            else:
                session.add(KpiHistorico(
                    entidad_tipo='carrera',
                    entidad_id=carrera_id,
                    fecha=hoy,
                    kpi_nombre=kpi_nombre,
                    valor=valor,
                ))
                guardados += 1

    logger.info("kpi_snapshot: %d carreras, %d nuevos, %d actualizados", len(carrera_ids), guardados, actualizados)
    return SnapshotResult(
        carreras_procesadas=len(carrera_ids),
        kpis_guardados=guardados,
        kpis_actualizados=actualizados,
    )
