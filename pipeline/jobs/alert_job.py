# pipeline/jobs/alert_job.py
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from pipeline.db.models import IES, CarreraIES, Carrera, Alerta, Usuario
from pipeline.kpi_engine.kpi_runner import run_kpis
from pipeline.services.email_service import send_alert_email

logger = logging.getLogger(__name__)

_WINDOW_HORAS = 24

_TITULOS = {
    "d1_alto": "D1 crítico",
    "d2_bajo": "D2 bajo",
    "ambos": "D1 crítico y D2 bajo",
}


@dataclass
class AlertaResumen:
    carrera_nombre: str
    tipo: str
    severidad: str
    mensaje: str


def _ya_existe(db: Session, ies_id: str, carrera_id: str, tipo: str) -> bool:
    cutoff = datetime.now(UTC) - timedelta(hours=_WINDOW_HORAS)
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


def _notificar_ies(db: Session, ies: IES, nuevas: list[dict]) -> None:
    if not nuevas:
        return
    rectores = db.query(Usuario).filter_by(ies_id=ies.id, activo=True).all()
    for rector in rectores:
        if rector.email:
            # Enviar una alerta por correo por cada alerta nueva
            for a in nuevas:
                send_alert_email(
                    rector.email,
                    ies.nombre,
                    a["carrera_nombre"],
                    a["severidad"],
                    a["mensaje"],
                    "Revisar el plan de estudios y estrategia de empleabilidad.",
                )


def run_alert_job(db: Session) -> int:
    """Persiste alertas KPI para todas las IES. Retorna número de alertas creadas."""
    creadas = 0
    for ies in db.query(IES).all():
        nuevas_ies: list[dict] = []
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
            mensaje = f"D1 = {d1:.2f} (umbral: 0.70) · D2 = {d2:.2f} (umbral: 0.40)"
            carrera = db.query(Carrera).filter_by(id=cie.carrera_id).first()
            db.add(
                Alerta(
                    ies_id=ies.id,
                    carrera_id=cie.carrera_id,
                    tipo=tipo,
                    severidad=severidad,
                    titulo=_TITULOS[tipo],
                    mensaje=mensaje,
                )
            )
            nuevas_ies.append({
                "carrera_nombre": carrera.nombre_norm.title() if carrera else cie.carrera_id,
                "tipo": tipo,
                "severidad": severidad,
                "mensaje": mensaje,
            })
            creadas += 1
        db.commit()
        _notificar_ies(db, ies, nuevas_ies)
    return creadas
