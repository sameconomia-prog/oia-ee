# api/routers/kpis.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import KpiOut, D1Out, D2Out, D3Out, D6Out, D4Out, D5Out, D7Out, IesKpiOut, EstadoKpiOut, NoticiasKpiOut
from pipeline.kpi_engine.kpi_runner import run_kpis, run_kpis_ies, run_kpis_estado, run_kpis_noticias

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


@router.get("/estado/{estado}", response_model=EstadoKpiOut)
def get_kpis_estado(estado: str, db: Session = Depends(get_db)):
    result = run_kpis_estado(estado, db)
    return EstadoKpiOut(
        estado=result.estado,
        d5_geografia=D5Out(**vars(result.d5_geografia)),
    )


@router.get("/noticias", response_model=NoticiasKpiOut)
def get_kpis_noticias(db: Session = Depends(get_db)):
    result = run_kpis_noticias(db)
    return NoticiasKpiOut(d7_noticias=D7Out(**vars(result.d7_noticias)))


@router.get("/historico/carrera/{carrera_id}")
def get_historico_carrera(
    carrera_id: str,
    kpi: str = "d1_score",
    limit: int = 30,
    db: Session = Depends(get_db),
):
    from pipeline.db.models import KpiHistorico
    valid_kpis = {"d1_score", "d2_score", "d3_score", "d6_score"}
    if kpi not in valid_kpis:
        raise HTTPException(status_code=400, detail=f"kpi debe ser uno de: {', '.join(sorted(valid_kpis))}")
    rows = (
        db.query(KpiHistorico)
        .filter_by(entidad_tipo='carrera', entidad_id=carrera_id, kpi_nombre=kpi)
        .order_by(KpiHistorico.fecha.asc())
        .limit(limit)
        .all()
    )
    return {
        "carrera_id": carrera_id,
        "kpi_nombre": kpi,
        "serie": [{"fecha": r.fecha.isoformat(), "valor": float(r.valor)} for r in rows],
    }
