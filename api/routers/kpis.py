# api/routers/kpis.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import KpiOut, D1Out, D2Out
from pipeline.kpi_engine.kpi_runner import run_kpis

router = APIRouter()


@router.get("/carrera/{carrera_id}", response_model=KpiOut)
def get_kpis_carrera(carrera_id: str, db: Session = Depends(get_db)):
    result = run_kpis(carrera_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Carrera no encontrada o sin datos de matrícula")
    return KpiOut(
        carrera_id=result.carrera_id,
        d1_obsolescencia=D1Out(**vars(result.d1_obsolescencia)),
        d2_oportunidades=D2Out(**vars(result.d2_oportunidades)),
    )
