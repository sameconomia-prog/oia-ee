# api/routers/publico.py
import time
import threading
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import NoticiaOut, CarreraKpiOut, KpiOut, D1Out, D2Out, D3Out, D6Out, IesOut, KpisNacionalResumenOut, SkillFreqOut, VacantePublicoOut, TopRiesgoItemOut, EstadisticasPublicasOut, CarreraDetalleOut, CarreraIesItemOut, IesDetalleOut
from pipeline.db.models import IES, Noticia, Alerta, Carrera, CarreraIES

router = APIRouter()

_kpis_cache_lock = threading.Lock()
_kpis_cache: dict = {"data": None, "at": 0.0}
_carreras_cache_lock = threading.Lock()
_carreras_cache: dict[tuple, dict] = {}
_KPIS_TTL = 300  # 5 minutes


def _clear_kpis_cache() -> None:
    with _kpis_cache_lock:
        _kpis_cache["data"] = None
        _kpis_cache["at"] = 0.0
    with _carreras_cache_lock:
        _carreras_cache.clear()


class ResumenPublico(BaseModel):
    total_ies: int
    total_noticias: int
    total_vacantes: int
    alertas_activas: int
    noticias_recientes: list[NoticiaOut]


@router.get("/resumen", response_model=ResumenPublico)
def resumen_publico(db: Session = Depends(get_db)):
    from pipeline.db.models import Vacante
    total_ies = db.query(IES).filter_by(activa=True).count()
    total_noticias = db.query(Noticia).count()
    total_vacantes = db.query(Vacante).count()
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
        total_vacantes=total_vacantes,
        alertas_activas=alertas_activas,
        noticias_recientes=noticias_recientes,
    )


@router.get("/carreras", response_model=list[CarreraKpiOut])
def listar_carreras_publico(
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from pipeline.kpi_engine.kpi_runner import run_kpis

    cache_key = (skip, limit, q or '')
    with _carreras_cache_lock:
        entry = _carreras_cache.get(cache_key)
    if entry and (time.time() - entry["at"]) < _KPIS_TTL:
        return entry["data"]

    carrera_query = db.query(CarreraIES.carrera_id).distinct()
    if q:
        carrera_query = (
            carrera_query
            .join(Carrera, CarreraIES.carrera_id == Carrera.id)
            .filter(Carrera.nombre_norm.ilike(f'%{q.lower()}%'))
        )
    carrera_ids = [
        r[0]
        for r in carrera_query
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

    with _carreras_cache_lock:
        _carreras_cache[cache_key] = {"data": result, "at": time.time()}

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


@router.get("/estadisticas", response_model=EstadisticasPublicasOut)
def estadisticas_publicas(db: Session = Depends(get_db)):
    import json
    from collections import Counter
    from pipeline.db.models import Vacante

    total_ies = db.query(IES).filter_by(activa=True).count()
    total_noticias = db.query(Noticia).count()
    alertas_activas = db.query(Alerta).filter_by(leida=False).count()
    total_vacantes = db.query(Vacante).count()

    carrera_ids = db.query(CarreraIES.carrera_id).distinct().count()

    rows = db.query(Vacante.skills).filter(Vacante.skills.isnot(None)).all()
    counter: Counter = Counter()
    for (skills_json,) in rows:
        try:
            counter.update(s.strip() for s in json.loads(skills_json) if isinstance(s, str) and s.strip())
        except (json.JSONDecodeError, TypeError):
            pass
    top_skills = [s for s, _ in counter.most_common(3)]

    return EstadisticasPublicasOut(
        total_ies=total_ies,
        total_carreras=carrera_ids,
        total_vacantes=total_vacantes,
        total_noticias=total_noticias,
        alertas_activas=alertas_activas,
        top_skills=top_skills,
    )


@router.get("/kpis/top-riesgo", response_model=list[TopRiesgoItemOut])
def top_carreras_riesgo(n: int = 5, db: Session = Depends(get_db)):
    from pipeline.kpi_engine.kpi_runner import run_kpis

    carrera_ids = [r[0] for r in db.query(CarreraIES.carrera_id).distinct().all()]
    items = []
    for cid in carrera_ids:
        carrera = db.query(Carrera).filter_by(id=cid).first()
        cie = db.query(CarreraIES).filter_by(carrera_id=cid).first()
        result = run_kpis(cid, db)
        if result:
            items.append(TopRiesgoItemOut(
                carrera_id=cid,
                nombre=carrera.nombre_norm.title() if carrera else cid,
                d1_score=result.d1_obsolescencia.score,
                d2_score=result.d2_oportunidades.score,
                matricula=cie.matricula if cie else None,
            ))

    items.sort(key=lambda x: x.d1_score, reverse=True)
    return items[:n]


@router.get("/kpis/tendencias")
def tendencias_nacionales(dias: int = 30, db: Session = Depends(get_db)):
    from collections import defaultdict
    from pipeline.db.models import KpiHistorico

    rows = (
        db.query(KpiHistorico)
        .filter(KpiHistorico.entidad_tipo == 'carrera')
        .filter(KpiHistorico.kpi_nombre.in_(['d1_score', 'd2_score', 'd3_score', 'd6_score']))
        .all()
    )

    if not rows:
        return []

    from datetime import date, timedelta
    hoy = date.today()
    cutoff = hoy - timedelta(days=dias)
    recientes = [r for r in rows if r.fecha and r.fecha >= cutoff]
    if not recientes:
        return []

    por_fecha_kpi: dict[tuple, list[float]] = defaultdict(list)
    for r in recientes:
        por_fecha_kpi[(str(r.fecha), r.kpi_nombre)].append(float(r.valor))

    fechas = sorted({str(r.fecha) for r in recientes})
    resultado = []
    for fecha in fechas:
        punto = {"fecha": fecha}
        for kpi in ['d1_score', 'd2_score', 'd3_score', 'd6_score']:
            vals = por_fecha_kpi.get((fecha, kpi), [])
            punto[kpi] = round(sum(vals) / len(vals), 4) if vals else None
        resultado.append(punto)
    return resultado


@router.get("/vacantes", response_model=list[VacantePublicoOut])
def listar_vacantes_publico(
    sector: Optional[str] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 25,
    db: Session = Depends(get_db),
):
    import json
    from pipeline.db.models import Vacante

    query = db.query(Vacante)
    if sector:
        query = query.filter(Vacante.sector == sector)
    if q:
        term = f"%{q.lower()}%"
        from sqlalchemy import func
        query = query.filter(
            func.lower(Vacante.titulo).like(term) |
            func.lower(Vacante.empresa).like(term) |
            func.lower(Vacante.estado).like(term)
        )
    rows = query.order_by(Vacante.fecha_pub.desc()).offset(skip).limit(limit).all()

    result = []
    for v in rows:
        try:
            skills = json.loads(v.skills) if v.skills else []
        except (json.JSONDecodeError, TypeError):
            skills = []
        result.append(VacantePublicoOut(
            id=v.id,
            titulo=v.titulo,
            empresa=v.empresa,
            sector=v.sector,
            skills=skills,
            salario_min=v.salario_min,
            salario_max=v.salario_max,
            estado=v.estado,
            nivel_educativo=v.nivel_educativo,
            experiencia_anios=v.experiencia_anios,
            fecha_pub=str(v.fecha_pub) if v.fecha_pub else None,
        ))
    return result


@router.get("/vacantes/skills", response_model=list[SkillFreqOut])
def top_vacantes_skills(top: int = 10, db: Session = Depends(get_db)):
    import json
    from collections import Counter
    from pipeline.db.models import Vacante

    rows = db.query(Vacante.skills).filter(Vacante.skills.isnot(None)).all()
    counter: Counter = Counter()
    for (skills_json,) in rows:
        try:
            skills = json.loads(skills_json)
            counter.update(s.strip() for s in skills if isinstance(s, str) and s.strip())
        except (json.JSONDecodeError, TypeError):
            pass

    return [SkillFreqOut(nombre=skill, count=count) for skill, count in counter.most_common(top)]


@router.get("/vacantes/{vacante_id}", response_model=VacantePublicoOut)
def detalle_vacante(vacante_id: str, db: Session = Depends(get_db)):
    import json
    from pipeline.db.models import Vacante
    from fastapi import HTTPException

    v = db.query(Vacante).filter_by(id=vacante_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    try:
        skills = json.loads(v.skills) if v.skills else []
    except (json.JSONDecodeError, TypeError):
        skills = []
    return VacantePublicoOut(
        id=v.id,
        titulo=v.titulo,
        empresa=v.empresa,
        sector=v.sector,
        skills=skills,
        salario_min=v.salario_min,
        salario_max=v.salario_max,
        estado=v.estado,
        nivel_educativo=v.nivel_educativo,
        experiencia_anios=v.experiencia_anios,
        fecha_pub=str(v.fecha_pub) if v.fecha_pub else None,
    )


@router.get("/ies/{ies_id}/carreras", response_model=list[CarreraKpiOut])
def carreras_de_ies(ies_id: str, db: Session = Depends(get_db)):
    from pipeline.kpi_engine.kpi_runner import run_kpis
    from pipeline.db.models import Vacante as _V  # noqa

    ies_obj = db.query(IES).filter_by(id=ies_id, activa=True).first()
    if not ies_obj:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="IES no encontrada")

    cie_list = db.query(CarreraIES).filter_by(ies_id=ies_id).all()
    result = []
    for cie in cie_list:
        carrera = db.query(Carrera).filter_by(id=cie.carrera_id).first()
        if not carrera:
            continue
        kpi_result = run_kpis(cie.carrera_id, db)
        kpi_out: Optional[KpiOut] = None
        if kpi_result:
            kpi_out = KpiOut(
                carrera_id=cie.carrera_id,
                d1_obsolescencia=D1Out(**vars(kpi_result.d1_obsolescencia)),
                d2_oportunidades=D2Out(**vars(kpi_result.d2_oportunidades)),
                d3_mercado=D3Out(**vars(kpi_result.d3_mercado)),
                d6_estudiantil=D6Out(**vars(kpi_result.d6_estudiantil)),
            )
        result.append(CarreraKpiOut(
            id=cie.carrera_id,
            nombre=carrera.nombre_norm.title(),
            matricula=cie.matricula,
            kpi=kpi_out,
        ))
    return result


@router.get("/sectores", response_model=list[str])
def listar_sectores_vacantes(db: Session = Depends(get_db)):
    from pipeline.db.models import Vacante
    rows = (
        db.query(Vacante.sector)
        .filter(Vacante.sector.isnot(None))
        .distinct()
        .order_by(Vacante.sector)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/carreras/{carrera_id}", response_model=CarreraDetalleOut)
def detalle_carrera(carrera_id: str, db: Session = Depends(get_db)):
    from pipeline.kpi_engine.kpi_runner import run_kpis
    from fastapi import HTTPException

    carrera = db.query(Carrera).filter_by(id=carrera_id).first()
    if not carrera:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")

    kpi_result = run_kpis(carrera_id, db)
    kpi_out: Optional[KpiOut] = None
    if kpi_result:
        kpi_out = KpiOut(
            carrera_id=carrera_id,
            d1_obsolescencia=D1Out(**vars(kpi_result.d1_obsolescencia)),
            d2_oportunidades=D2Out(**vars(kpi_result.d2_oportunidades)),
            d3_mercado=D3Out(**vars(kpi_result.d3_mercado)),
            d6_estudiantil=D6Out(**vars(kpi_result.d6_estudiantil)),
        )

    cie_list = db.query(CarreraIES).filter_by(carrera_id=carrera_id).all()
    instituciones = []
    for cie in cie_list:
        ies_obj = db.query(IES).filter_by(id=cie.ies_id).first()
        if ies_obj:
            instituciones.append(CarreraIesItemOut(
                ies_id=cie.ies_id,
                ies_nombre=ies_obj.nombre,
                matricula=cie.matricula,
                ciclo=cie.ciclo,
            ))

    return CarreraDetalleOut(
        id=carrera_id,
        nombre=carrera.nombre_norm.title(),
        kpi=kpi_out,
        instituciones=instituciones,
    )


@router.get("/ies/{ies_id}", response_model=IesDetalleOut)
def detalle_ies(ies_id: str, db: Session = Depends(get_db)):
    from pipeline.kpi_engine.kpi_runner import run_kpis
    from fastapi import HTTPException

    ies_obj = db.query(IES).filter_by(id=ies_id, activa=True).first()
    if not ies_obj:
        raise HTTPException(status_code=404, detail="IES no encontrada")

    cie_list = db.query(CarreraIES).filter_by(ies_id=ies_id).all()
    d1_scores = []
    d2_scores = []
    for cie in cie_list:
        result = run_kpis(cie.carrera_id, db)
        if result:
            d1_scores.append(result.d1_obsolescencia.score)
            d2_scores.append(result.d2_oportunidades.score)

    def avg(lst: list[float]) -> float:
        return round(sum(lst) / len(lst), 4) if lst else 0.0

    return IesDetalleOut(
        id=ies_id,
        nombre=ies_obj.nombre,
        nombre_corto=ies_obj.nombre_corto,
        total_carreras=len(cie_list),
        promedio_d1=avg(d1_scores),
        promedio_d2=avg(d2_scores),
        carreras_riesgo_alto=sum(1 for s in d1_scores if s >= 0.6),
    )


@router.get("/ies", response_model=list[IesOut])
def listar_ies_publico(db: Session = Depends(get_db)):
    ies_list = db.query(IES).filter_by(activa=True).order_by(IES.nombre).all()
    return [IesOut(id=i.id, nombre=i.nombre, nombre_corto=i.nombre_corto) for i in ies_list]
