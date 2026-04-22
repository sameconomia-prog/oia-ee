# pipeline/jobs/alert_job.py
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from pipeline.db.models import IES, CarreraIES, Carrera, Alerta
from pipeline.kpi_engine.kpi_runner import run_kpis

_WINDOW_HORAS = 24

_TITULOS = {
    "d1_alto": "D1 crítico",
    "d2_bajo": "D2 bajo",
    "ambos": "D1 crítico y D2 bajo",
}


def _ya_existe(db: Session, ies_id: str, carrera_id: str, tipo: str) -> bool:
    cutoff = datetime.utcnow() - timedelta(hours=_WINDOW_HORAS)
    return (
        db.query(Alerta)
        .filter(
            Alerta.ies_id == ies_id,
            Alerta.carrera_id == carrera_id,
            Alerta.tipo == tipo,
            Alerta.fecha >= cutoff,
        )
        .first()
    ) is not None


def run_alert_job(db: Session) -> int:
    """Persiste alertas KPI para todas las IES. Retorna número de alertas creadas."""
    creadas = 0
    for ies in db.query(IES).all():
        for cie in db.query(CarreraIES).filter_by(ies_id=ies.id).all():
            kpi = run_kpis(cie.carrera_id, db)
            if not kpi:
                continue
            d1 = kpi.d1_obsolescencia.score
            d2 = kpi.d2_oportunidades.score
            d1_alert = d1 > 0.7
            d2_alert = d2 < 0.4
            if not (d1_alert or d2_alert):
                continue
            tipo = "ambos" if (d1_alert and d2_alert) else ("d1_alto" if d1_alert else "d2_bajo")
            if _ya_existe(db, ies.id, cie.carrera_id, tipo):
                continue
            severidad = "alta" if (d1 > 0.8 or d2 < 0.3) else "media"
            db.add(
                Alerta(
                    ies_id=ies.id,
                    carrera_id=cie.carrera_id,
                    tipo=tipo,
                    severidad=severidad,
                    titulo=_TITULOS[tipo],
                    mensaje=f"D1 = {d1:.2f} (umbral: 0.70) · D2 = {d2:.2f} (umbral: 0.40)",
                )
            )
            creadas += 1
    db.commit()
    return creadas
