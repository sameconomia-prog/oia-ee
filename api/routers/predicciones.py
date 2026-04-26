from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from api.deps import get_db
from pipeline.db.models_predictor import PrediccionKpi

router = APIRouter()


def _semaforo_color(d1_valor: float) -> str:
    if d1_valor < 0.60:
        return "verde"
    if d1_valor < 0.80:
        return "amarillo"
    return "rojo"


@router.get("/carrera/{carrera_id}/semaforo")
def get_semaforo_carrera(
    carrera_id: str,
    db: Session = Depends(get_db),
):
    result = {}
    for años, label in [(1, "1_año"), (3, "3_años"), (5, "5_años")]:
        pred = (
            db.query(PrediccionKpi)
            .filter_by(
                entidad_tipo="carrera",
                entidad_id=carrera_id,
                kpi_nombre="D1",
                horizonte_años=años,
            )
            .order_by(PrediccionKpi.fecha_prediccion.desc())
            .first()
        )
        if pred:
            result[label] = {
                "color": _semaforo_color(pred.valor_predicho),
                "valor_predicho": pred.valor_predicho,
                "fecha_prediccion": str(pred.fecha_prediccion),
            }
        else:
            result[label] = {"color": "sin_datos", "valor_predicho": None, "fecha_prediccion": None}

    return result


@router.get("/carrera/{carrera_id}")
def get_predicciones_carrera(
    carrera_id: str,
    kpi: Optional[str] = None,
    horizonte: Optional[int] = Query(None, ge=1, le=5),
    db: Session = Depends(get_db),
):
    q = db.query(PrediccionKpi).filter_by(entidad_tipo="carrera", entidad_id=carrera_id)
    if kpi:
        q = q.filter(PrediccionKpi.kpi_nombre == kpi.upper())
    if horizonte:
        q = q.filter(PrediccionKpi.horizonte_años == horizonte)

    rows = q.order_by(PrediccionKpi.kpi_nombre, PrediccionKpi.horizonte_años,
                      PrediccionKpi.fecha_prediccion).all()

    predicciones: dict = {}
    for row in rows:
        key = row.kpi_nombre
        if key not in predicciones:
            predicciones[key] = []
        predicciones[key].append({
            "horizonte_años": row.horizonte_años,
            "fecha_prediccion": str(row.fecha_prediccion),
            "valor_predicho": row.valor_predicho,
            "ci_80_lower": row.ci_80_lower,
            "ci_80_upper": row.ci_80_upper,
            "ci_95_lower": row.ci_95_lower,
            "ci_95_upper": row.ci_95_upper,
            "modelo_version": row.modelo_version,
        })

    return {"carrera_id": carrera_id, "predicciones": predicciones}
