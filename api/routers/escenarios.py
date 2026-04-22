# api/routers/escenarios.py
import json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import SimularInput, SimularResult
from pipeline.db.models import Escenario
from pipeline.scenario_engine.simulator import D1Inputs, D2Inputs, simulate_kpis

router = APIRouter()


@router.post("/simular", response_model=SimularResult)
def simular(body: SimularInput, db: Session = Depends(get_db)):
    result = simulate_kpis(
        D1Inputs(iva=body.iva, bes=body.bes, vac=body.vac),
        D2Inputs(ioe=body.ioe, ihe=body.ihe, iea=body.iea),
    )
    escenario = Escenario(
        ies_id=body.ies_id,
        tipo="custom",
        horizonte_anios=None,
        acciones=json.dumps({
            "carrera_id": body.carrera_id,
            "carrera_nombre": body.carrera_nombre,
            "iva": body.iva, "bes": body.bes, "vac": body.vac,
            "ioe": body.ioe, "ihe": body.ihe, "iea": body.iea,
        }),
        proyecciones=json.dumps({
            "d1_score": result.d1_score,
            "d2_score": result.d2_score,
        }),
    )
    db.add(escenario)
    db.commit()
    db.refresh(escenario)
    fecha = (
        escenario.fecha_creacion.isoformat()
        if escenario.fecha_creacion
        else datetime.utcnow().isoformat()
    )
    return SimularResult(
        id=escenario.id,
        carrera_nombre=body.carrera_nombre,
        d1_score=result.d1_score,
        d2_score=result.d2_score,
        iva=body.iva, bes=body.bes, vac=body.vac,
        ioe=body.ioe, ihe=body.ihe, iea=body.iea,
        fecha=fecha,
    )
