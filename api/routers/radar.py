# api/routers/radar.py
"""Endpoints públicos del Radar de Impacto IA."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from api.deps import get_db
from pipeline.db.models_radar import EventoIADespido, EventoIAEmpleo, SkillEmergente

router = APIRouter()


@router.get("/despidos")
def list_despidos(
    pais: Optional[str] = None,
    sector: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(EventoIADespido).filter_by(revocado=False)
    if pais:
        q = q.filter(EventoIADespido.pais == pais.upper())
    if sector:
        q = q.filter(EventoIADespido.sector.ilike(f"%{sector}%"))
    total = q.count()
    items = q.order_by(desc(EventoIADespido.fecha_anuncio)).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": ev.id,
                "empresa": ev.empresa,
                "sector": ev.sector,
                "pais": ev.pais,
                "fecha_anuncio": str(ev.fecha_anuncio),
                "numero_despidos": ev.numero_despidos,
                "ahorro_anual_usd": ev.ahorro_anual_usd,
                "ia_tecnologia": ev.ia_tecnologia,
                "area_reemplazada": ev.area_reemplazada,
                "confiabilidad": ev.confiabilidad,
                "fuente_url": ev.fuente_url,
            }
            for ev in items
        ],
    }


@router.get("/despidos/estadisticas")
def despidos_estadisticas(db: Session = Depends(get_db)):
    total_despidos = db.query(func.sum(EventoIADespido.numero_despidos)).scalar() or 0
    total_ahorro = db.query(func.sum(EventoIADespido.ahorro_anual_usd)).scalar() or 0
    total_eventos = db.query(func.count(EventoIADespido.id)).scalar() or 0
    por_sector = (
        db.query(EventoIADespido.sector, func.sum(EventoIADespido.numero_despidos).label("total"))
        .filter(EventoIADespido.sector.isnot(None))
        .group_by(EventoIADespido.sector)
        .order_by(desc("total"))
        .limit(10)
        .all()
    )
    return {
        "total_despidos_acumulados": int(total_despidos),
        "ahorro_salarial_anual_usd": float(total_ahorro),
        "total_eventos": int(total_eventos),
        "top_sectores": [{"sector": r.sector, "despidos": int(r.total or 0)} for r in por_sector],
    }


@router.get("/empleos")
def list_empleos(
    pais: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(EventoIAEmpleo)
    if pais:
        q = q.filter(EventoIAEmpleo.pais == pais.upper())
    total = q.count()
    items = q.order_by(desc(EventoIAEmpleo.fecha_anuncio)).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": ev.id,
                "empresa": ev.empresa,
                "sector": ev.sector,
                "pais": ev.pais,
                "fecha_anuncio": str(ev.fecha_anuncio),
                "numero_empleos": ev.numero_empleos,
                "titulo_puesto": ev.titulo_puesto,
                "habilidades_requeridas": ev.habilidades_requeridas,
                "salario_min_usd": ev.salario_min_usd,
                "salario_max_usd": ev.salario_max_usd,
                "confiabilidad": ev.confiabilidad,
            }
            for ev in items
        ],
    }


@router.get("/skills")
def list_skills(
    categoria: Optional[str] = None,
    tendencia: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(SkillEmergente)
    if categoria:
        q = q.filter(SkillEmergente.categoria == categoria)
    if tendencia:
        q = q.filter(SkillEmergente.tendencia_90d == tendencia)
    items = q.order_by(desc(SkillEmergente.menciones_30d)).limit(50).all()
    return {
        "total": len(items),
        "items": [
            {
                "skill": sk.skill,
                "categoria": sk.categoria,
                "menciones_30d": sk.menciones_30d,
                "tendencia_90d": sk.tendencia_90d,
                "velocidad_crecimiento_pct": sk.velocidad_crecimiento_pct,
                "sectores_demandantes": sk.sectores_demandantes,
                "salario_premium_pct": sk.salario_premium_pct,
            }
            for sk in items
        ],
    }
