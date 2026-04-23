# api/routers/escenarios.py
import json
from datetime import datetime, UTC
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.deps import get_db, get_current_user
from api.schemas import SimularInput, SimularResult, EscenarioOut, EscenariosHistorialOut
from pipeline.db.models import Escenario, Usuario
from pipeline.scenario_engine.simulator import D1Inputs, D2Inputs, simulate_kpis

router = APIRouter()


@router.post("/simular", response_model=SimularResult)
def simular(
    body: SimularInput,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if body.ies_id != current_user.ies_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

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
        else datetime.now(UTC).isoformat()
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


@router.get("/", response_model=EscenariosHistorialOut)
def get_escenarios(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # ies_id se deriva del token — no se acepta como query param para evitar IDOR
    ies_id = current_user.ies_id
    q = db.query(Escenario).filter(Escenario.ies_id == ies_id)
    total = q.count()
    rows = q.order_by(Escenario.fecha_creacion.desc()).offset(skip).limit(limit).all()
    items = []
    for e in rows:
        acciones = json.loads(e.acciones or "{}")
        proyecciones = json.loads(e.proyecciones or "{}")
        items.append(EscenarioOut(
            id=e.id,
            carrera_nombre=acciones.get("carrera_nombre", ""),
            carrera_id=acciones.get("carrera_id", ""),
            d1_score=proyecciones.get("d1_score", 0.0),
            d2_score=proyecciones.get("d2_score", 0.0),
            iva=acciones.get("iva", 0.0),
            bes=acciones.get("bes", 0.0),
            vac=acciones.get("vac", 0.0),
            ioe=acciones.get("ioe", 0.0),
            ihe=acciones.get("ihe", 0.0),
            iea=acciones.get("iea", 0.0),
            fecha=e.fecha_creacion.isoformat() if e.fecha_creacion else datetime.now(UTC).isoformat(),
        ))
    return EscenariosHistorialOut(escenarios=items, total=total)
