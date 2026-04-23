# api/routers/rector.py
from datetime import datetime, UTC
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.deps import get_db, get_current_user
from api.schemas import RectorOut, IesOut, CarreraKpiOut, AlertaItemOut, KpiOut, D1Out, D2Out
from pipeline.db.models import IES, Carrera, CarreraIES, Usuario
from pipeline.kpi_engine.kpi_runner import run_kpis

router = APIRouter()


def _severidad(d1: float, d2: float, d1_alert: bool, d2_alert: bool) -> str:
    if d1_alert and d1 > 0.8:
        return "alta"
    if d2_alert and d2 < 0.3:
        return "alta"
    return "media"


def _titulo(tipo: str) -> str:
    return {"d1_alto": "D1 crítico", "d2_bajo": "D2 bajo", "ambos": "D1 crítico y D2 bajo"}[tipo]


@router.get("/", response_model=RectorOut)
def get_rector_dashboard(
    ies_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if ies_id != current_user.ies_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    ies = db.query(IES).filter_by(id=ies_id).first()
    if not ies:
        raise HTTPException(status_code=404, detail="IES no encontrada")

    carrera_ies_list = db.query(CarreraIES).filter_by(ies_id=ies_id).all()
    carreras_out: list[CarreraKpiOut] = []
    alertas_out: list[AlertaItemOut] = []

    for cie in carrera_ies_list:
        carrera = db.query(Carrera).filter_by(id=cie.carrera_id).first()
        if not carrera:
            continue

        kpi_result = run_kpis(cie.carrera_id, db)
        kpi_out = None
        if kpi_result:
            kpi_out = KpiOut(
                carrera_id=cie.carrera_id,
                d1_obsolescencia=D1Out(**vars(kpi_result.d1_obsolescencia)),
                d2_oportunidades=D2Out(**vars(kpi_result.d2_oportunidades)),
            )
            d1 = kpi_result.d1_obsolescencia.score
            d2 = kpi_result.d2_oportunidades.score
            d1_alert = d1 > 0.7
            d2_alert = d2 < 0.4
            if d1_alert or d2_alert:
                tipo = "ambos" if (d1_alert and d2_alert) else ("d1_alto" if d1_alert else "d2_bajo")
                alertas_out.append(AlertaItemOut(
                    id=f"{cie.carrera_id}-alert",
                    carrera_nombre=carrera.nombre_norm,
                    tipo=tipo,
                    severidad=_severidad(d1, d2, d1_alert, d2_alert),
                    titulo=_titulo(tipo),
                    mensaje=f"D1 = {d1:.2f} (umbral: 0.70) · D2 = {d2:.2f} (umbral: 0.40)",
                    fecha=datetime.now(UTC).isoformat(),
                ))

        carreras_out.append(CarreraKpiOut(
            id=cie.carrera_id,
            nombre=carrera.nombre_norm,
            matricula=cie.matricula,
            kpi=kpi_out,
        ))

    alertas_out.sort(key=lambda a: 0 if a.severidad == "alta" else 1)
    return RectorOut(
        ies=IesOut(id=ies.id, nombre=ies.nombre, nombre_corto=ies.nombre_corto),
        carreras=carreras_out,
        alertas=alertas_out,
    )
