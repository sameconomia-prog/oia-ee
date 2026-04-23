# api/routers/kpis.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import KpiOut, D1Out, D2Out, D3Out, D6Out, D4Out, IesKpiOut
from pipeline.kpi_engine.kpi_runner import run_kpis, run_kpis_ies

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
        d3_mercado=D3Out(**vars(result.d3_mercado)),
        d6_estudiantil=D6Out(**vars(result.d6_estudiantil)),
    )


@router.get("/ies/{ies_id}", response_model=IesKpiOut)
def get_kpis_ies(ies_id: str, db: Session = Depends(get_db)):
    result = run_kpis_ies(ies_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="IES no encontrada")
    return IesKpiOut(
        ies_id=result.ies_id,
        d4_institucional=D4Out(**vars(result.d4_institucional)),
    )
