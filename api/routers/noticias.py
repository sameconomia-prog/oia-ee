# api/routers/noticias.py
import os
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from api.deps import get_db
from pipeline.db.models import Noticia
from pipeline.utils.embeddings import embed_text, search_similar
from api.schemas import NoticiaOut

router = APIRouter()


@router.get("/", response_model=list[NoticiaOut])
def list_noticias(
    skip: int = 0,
    limit: int = 20,
    sector: Optional[str] = Query(None),
    impacto: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Noticia)
    if sector:
        q = q.filter(Noticia.sector == sector)
    if impacto:
        q = q.filter(Noticia.tipo_impacto == impacto)
    return q.offset(skip).limit(limit).all()


@router.get("/sectores", response_model=list[str])
def listar_sectores_noticias(db: Session = Depends(get_db)):
    rows = (
        db.query(Noticia.sector)
        .filter(Noticia.sector.isnot(None))
        .distinct()
        .order_by(Noticia.sector)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/buscar", response_model=list[NoticiaOut])
def buscar_noticias(
    q: str = Query(..., min_length=1),
    top_k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    api_key = os.getenv("VOYAGE_API_KEY", "")
    if not api_key:
        return []
    vector = embed_text(q, api_key)
    if vector is None:
        return []
    return search_similar(vector, db, top_k)


@router.get("/tendencia")
def tendencia_noticias(meses: int = 12, db: Session = Depends(get_db)):
    from sqlalchemy import func
    rows = (
        db.query(
            func.strftime('%Y-%m', Noticia.fecha_pub).label('mes'),
            func.count(Noticia.id).label('count'),
        )
        .filter(Noticia.fecha_pub.isnot(None))
        .group_by('mes')
        .order_by('mes')
        .all()
    )
    if not rows:
        return []
    result = [{"mes": row.mes, "count": row.count} for row in rows]
    return result[-meses:] if len(result) > meses else result


@router.get("/{noticia_id}", response_model=NoticiaOut)
def get_noticia(noticia_id: str, db: Session = Depends(get_db)):
    noticia = db.query(Noticia).filter_by(id=noticia_id).first()
    if not noticia:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    return noticia
