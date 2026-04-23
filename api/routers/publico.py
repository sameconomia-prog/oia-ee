# api/routers/publico.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import NoticiaOut
from pipeline.db.models import IES, Noticia, Alerta

router = APIRouter()


class ResumenPublico(BaseModel):
    total_ies: int
    total_noticias: int
    alertas_activas: int
    noticias_recientes: list[NoticiaOut]


@router.get("/resumen", response_model=ResumenPublico)
def resumen_publico(db: Session = Depends(get_db)):
    total_ies = db.query(IES).filter_by(activa=True).count()
    total_noticias = db.query(Noticia).count()
    alertas_activas = db.query(Alerta).filter_by(leida=False).count()
    noticias_recientes = (
        db.query(Noticia)
        .order_by(Noticia.fecha_ingesta.desc())
        .limit(5)
        .all()
    )
    return ResumenPublico(
        total_ies=total_ies,
        total_noticias=total_noticias,
        alertas_activas=alertas_activas,
        noticias_recientes=noticias_recientes,
    )
