# api/routers/publico.py
import time
import threading
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import NoticiaOut, CarreraKpiOut, KpiOut, D1Out, D2Out, D3Out, D6Out, IesOut, KpisNacionalResumenOut
from pipeline.db.models import IES, Noticia, Alerta, Carrera, CarreraIES

router = APIRouter()

_kpis_cache_lock = threading.Lock()
_kpis_cache: dict = {"data": None, "at": 0.0}
_KPIS_TTL = 300  # 5 minutes


def _clear_kpis_cache() -> None:
    with _kpis_cache_lock:
        _kpis_cache["data"] = None
        _kpis_cache["at"] = 0.0


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


@router.get("/carreras", response_model=list[CarreraKpiOut])
def listar_carreras_publico(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    from pipeline.kpi_engine.kpi_runner import run_kpis

    carrera_ids = [
        r[0]
        for r in db.query(CarreraIES.carrera_id)
        .distinct()
        .offset(skip)
        .limit(limit)
        .all()
    ]

    result = []
    for cid in carrera_ids:
        carrera = db.query(Carrera).filter_by(id=cid).first()
        if not carrera:
            continue
        cie = db.query(CarreraIES).filter_by(carrera_id=cid).first()
        kpi_result = run_kpis(cid, db)
        kpi_out: Optional[KpiOut] = None
        if kpi_result:
            kpi_out = KpiOut(
                carrera_id=cid,
                d1_obsolescencia=D1Out(**vars(kpi_result.d1_obsolescencia)),
                d2_oportunidades=D2Out(**vars(kpi_result.d2_oportunidades)),
                d3_mercado=D3Out(**vars(kpi_result.d3_mercado)),
                d6_estudiantil=D6Out(**vars(kpi_result.d6_estudiantil)),
            )
        result.append(CarreraKpiOut(
            id=cid,
            nombre=carrera.nombre_norm.title(),
            matricula=cie.matricula if cie else None,
            kpi=kpi_out,
        ))
    return result


@router.get("/kpis/resumen", response_model=KpisNacionalResumenOut)
def resumen_kpis_nacional(db: Session = Depends(get_db)):
    from pipeline.kpi_engine.kpi_runner import run_kpis

    with _kpis_cache_lock:
        cached_data = _kpis_cache["data"]
        cached_at = _kpis_cache["at"]

    if cached_data is not None and (time.time() - cached_at) < _KPIS_TTL:
        return cached_data

    carrera_ids = [
        r[0]
        for r in db.query(CarreraIES.carrera_id).distinct().all()
    ]

    d1_scores, d2_scores, d3_scores, d6_scores = [], [], [], []
    for cid in carrera_ids:
        result = run_kpis(cid, db)
        if result:
            d1_scores.append(result.d1_obsolescencia.score)
            d2_scores.append(result.d2_oportunidades.score)
            d3_scores.append(result.d3_mercado.score)
            d6_scores.append(result.d6_estudiantil.score)

    total = len(d1_scores)

    def avg(lst: list[float]) -> float:
        return round(sum(lst) / len(lst), 4) if lst else 0.0

    result_out = KpisNacionalResumenOut(
        total_carreras=total,
        promedio_d1=avg(d1_scores),
        promedio_d2=avg(d2_scores),
        promedio_d3=avg(d3_scores),
        promedio_d6=avg(d6_scores),
        carreras_riesgo_alto=sum(1 for s in d1_scores if s >= 0.6),
        carreras_oportunidad_alta=sum(1 for s in d2_scores if s >= 0.6),
    )

    with _kpis_cache_lock:
        _kpis_cache["data"] = result_out
        _kpis_cache["at"] = time.time()

    return result_out


@router.get("/ies", response_model=list[IesOut])
def listar_ies_publico(db: Session = Depends(get_db)):
    ies_list = db.query(IES).filter_by(activa=True).order_by(IES.nombre).all()
    return [IesOut(id=i.id, nombre=i.nombre, nombre_corto=i.nombre_corto) for i in ies_list]
