from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from api.deps import get_db, rate_limit_public
from pipeline.skill_graph.builder import build_skill_graph

router = APIRouter(dependencies=[Depends(rate_limit_public)])


@router.get("/carreras/{carrera_id}/skill-graph")
def get_skill_graph(
    carrera_id: str,
    top_n: int = Query(20, ge=5, le=50),
    db: Session = Depends(get_db),
):
    result = build_skill_graph(carrera_id, db, top_n=top_n)
    if result["carrera_nombre"] is None:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")
    return result
