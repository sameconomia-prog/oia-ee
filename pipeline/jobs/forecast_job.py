import structlog
from sqlalchemy.orm import Session
from pipeline.db import get_session
from pipeline.db.models import KpiHistorico, Carrera
from pipeline.db.models_predictor import PrediccionKpi
from pipeline.predictor.forecaster import run_forecast
from pipeline.predictor.skills_aggregator import aggregate_skills_from_vacantes

logger = structlog.get_logger()

_HORIZONTES = {1: 4, 3: 12, 5: 20}  # años → trimestres
_KPIS = ["D1", "D2"]


def _get_series(db: Session, entidad_id: str, kpi_nombre: str) -> list[tuple]:
    rows = (
        db.query(KpiHistorico.fecha, KpiHistorico.valor)
        .filter_by(entidad_tipo="carrera", entidad_id=entidad_id, kpi_nombre=kpi_nombre)
        .order_by(KpiHistorico.fecha.asc())
        .all()
    )
    return [(r.fecha, float(r.valor)) for r in rows if r.valor is not None]


def run_forecast_job() -> None:
    with get_session() as db:
        carreras = db.query(Carrera).all()
        total_preds = 0

        for carrera in carreras:
            for kpi in _KPIS:
                series = _get_series(db, carrera.id, kpi)
                for años, trimestres in _HORIZONTES.items():
                    pred_rows = run_forecast(series, horizonte_trimestres=trimestres)
                    if not pred_rows:
                        continue
                    db.query(PrediccionKpi).filter_by(
                        entidad_tipo="carrera",
                        entidad_id=carrera.id,
                        kpi_nombre=kpi,
                        horizonte_años=años,
                    ).delete()
                    for row in pred_rows:
                        db.add(PrediccionKpi(
                            entidad_tipo="carrera",
                            entidad_id=carrera.id,
                            kpi_nombre=kpi,
                            horizonte_años=años,
                            fecha_prediccion=row.fecha_prediccion,
                            valor_predicho=row.valor_predicho,
                            ci_80_lower=row.ci_80_lower,
                            ci_80_upper=row.ci_80_upper,
                            ci_95_lower=row.ci_95_lower,
                            ci_95_upper=row.ci_95_upper,
                            modelo_version=row.modelo_version,
                        ))
                        total_preds += 1
        logger.info("forecast_job_done", carreras=len(carreras), predicciones=total_preds)


def run_skills_job() -> None:
    with get_session() as db:
        count = aggregate_skills_from_vacantes(db)
        logger.info("skills_job_done", skills_actualizados=count)
