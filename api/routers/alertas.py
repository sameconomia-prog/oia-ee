# api/routers/alertas.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.deps import get_db, get_current_user
from api.schemas import AlertaDBOut, AlertasHistorialOut, AlertaLeidaOut
from pipeline.db.models import Alerta, Carrera, Usuario

router = APIRouter()


@router.get("/", response_model=AlertasHistorialOut)
def get_alertas(
    ies_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if ies_id != current_user.ies_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    total = db.query(Alerta).filter_by(ies_id=ies_id).count()
    alertas = (
        db.query(Alerta)
        .filter_by(ies_id=ies_id)
        .order_by(Alerta.leida.asc(), Alerta.fecha.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for a in alertas:
        carrera = db.query(Carrera).filter_by(id=a.carrera_id).first()
        result.append(
            AlertaDBOut(
                id=a.id,
                ies_id=a.ies_id,
                carrera_id=a.carrera_id,
                carrera_nombre=carrera.nombre_norm if carrera else "—",
                tipo=a.tipo,
                severidad=a.severidad,
                titulo=a.titulo,
                mensaje=a.mensaje,
                fecha=a.fecha.isoformat() if a.fecha else "",
                leida=bool(a.leida),
            )
        )
    return AlertasHistorialOut(alertas=result, total=total)


@router.put("/{alerta_id}/leer", response_model=AlertaLeidaOut)
def marcar_leida(
    alerta_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    alerta = db.query(Alerta).filter_by(id=alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    if alerta.ies_id != current_user.ies_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    alerta.leida = True
    db.commit()
    return AlertaLeidaOut(id=alerta.id, leida=bool(alerta.leida))
