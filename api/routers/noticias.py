# api/routers/noticias.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from api.deps import get_db
from pipeline.db.models import Noticia
from api.schemas import NoticiaOut

router = APIRouter()


@router.get("/", response_model=list[NoticiaOut])
def list_noticias(
    skip: int = 0,
    limit: int = 20,
    sector: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Noticia)
    if sector:
        q = q.filter(Noticia.sector == sector)
    return q.offset(skip).limit(limit).all()


@router.get("/{noticia_id}", response_model=NoticiaOut)
def get_noticia(noticia_id: str, db: Session = Depends(get_db)):
    noticia = db.query(Noticia).filter_by(id=noticia_id).first()
    if not noticia:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    return noticia
