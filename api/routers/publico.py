# api/routers/publico.py
import time
import threading
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from api.deps import get_db, rate_limit_public
from api.schemas import NoticiaOut, CarreraKpiOut, KpiOut, D1Out, D2Out, D3Out, D6Out, IesOut, KpisNacionalResumenOut, SkillFreqOut, VacantePublicoOut, TopRiesgoItemOut, EstadisticasPublicasOut, CarreraDetalleOut, CarreraIesItemOut, IesDetalleOut, KpisDistribucionOut, KpisBinOut
from pipeline.db.models import IES, Noticia, Alerta, Carrera, CarreraIES

router = APIRouter(dependencies=[Depends(rate_limit_public)])

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


@router.get("/carreras/areas")
def listar_areas_carreras(db: Session = Depends(get_db)):
    rows = (
        db.query(Carrera.area_conocimiento)
        .join(CarreraIES, CarreraIES.carrera_id == Carrera.id)
        .filter(Carrera.area_conocimiento.isnot(None))
        .distinct()
        .order_by(Carrera.area_conocimiento)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/carreras", response_model=list[CarreraKpiOut])
def listar_carreras_publico(
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    area: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from pipeline.kpi_engine.kpi_runner import run_kpis

    cache_key = (skip, limit, q or '', area or '')
    with _carreras_cache_lock:
        entry = _carreras_cache.get(cache_key)
    if entry and (time.time() - entry["at"]) < _KPIS_TTL:
        return entry["data"]

    carrera_query = db.query(CarreraIES.carrera_id).distinct().join(Carrera, CarreraIES.carrera_id == Carrera.id)
    if q:
        carrera_query = carrera_query.filter(Carrera.nombre_norm.ilike(f'%{q.lower()}%'))
    if area:
        carrera_query = carrera_query.filter(Carrera.area_conocimiento == area)
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
            area_conocimiento=carrera.area_conocimiento,
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


@router.get("/kpis/top-oportunidades", response_model=list[TopRiesgoItemOut])
def top_carreras_oportunidades(n: int = 5, db: Session = Depends(get_db)):
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

    items.sort(key=lambda x: x.d2_score, reverse=True)
    return items[:n]


@router.get("/kpis/distribucion", response_model=KpisDistribucionOut)
def kpis_distribucion(db: Session = Depends(get_db)):
    from pipeline.kpi_engine.kpi_runner import run_kpis
    carrera_ids = [row[0] for row in db.query(CarreraIES.carrera_id).distinct().all()]
    BINS = [
        ("Bajo (0–0.4)", 0.0, 0.4),
        ("Medio (0.4–0.6)", 0.4, 0.6),
        ("Alto (0.6–1.0)", 0.6, 1.0),
    ]
    d1_counts = {label: 0 for label, _, _ in BINS}
    d2_counts = {label: 0 for label, _, _ in BINS}
    for cid in carrera_ids:
        result = run_kpis(cid, db)
        if not result:
            continue
        for label, lo, hi in BINS:
            if lo <= result.d1_obsolescencia.score < hi or (hi == 1.0 and result.d1_obsolescencia.score == 1.0):
                d1_counts[label] += 1
            if lo <= result.d2_oportunidades.score < hi or (hi == 1.0 and result.d2_oportunidades.score == 1.0):
                d2_counts[label] += 1
    return KpisDistribucionOut(
        d1=[KpisBinOut(rango=label, min_val=lo, max_val=hi, count=d1_counts[label]) for label, lo, hi in BINS],
        d2=[KpisBinOut(rango=label, min_val=lo, max_val=hi, count=d2_counts[label]) for label, lo, hi in BINS],
    )


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


@router.get("/vacantes/tendencia")
def tendencia_vacantes(meses: int = 12, db: Session = Depends(get_db)):
    from pipeline.db.models import Vacante
    from sqlalchemy import func
    rows = (
        db.query(
            func.strftime('%Y-%m', Vacante.fecha_pub).label('mes'),
            func.count(Vacante.id).label('count'),
        )
        .filter(Vacante.fecha_pub.isnot(None))
        .group_by('mes')
        .order_by('mes')
        .all()
    )
    if not rows:
        return []
    result = [{"mes": row.mes, "count": row.count} for row in rows]
    return result[-meses:] if len(result) > meses else result


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
        area_conocimiento=carrera.area_conocimiento,
        nivel=carrera.nivel,
        duracion_anios=carrera.duracion_anios,
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


@router.get("/impacto")
def resumen_impacto(db: Session = Depends(get_db)):
    """Mapa completo de impacto IA en empleo: despidos, empleos generados, vacantes, ocupaciones."""
    import json
    from collections import Counter, defaultdict
    from pipeline.db.models import Vacante, Ocupacion
    from sqlalchemy import func

    TIPOS_DESPIDO = ('despido_masivo', 'desplazamiento')
    TIPOS_POSITIVO = ('adopcion_ia', 'nueva_carrera', 'oportunidad', 'augmentación', 'regulacion')

    noticias_despido = (
        db.query(Noticia)
        .filter(Noticia.tipo_impacto.in_(TIPOS_DESPIDO))
        .order_by(Noticia.n_empleados.desc())
        .all()
    )
    total_empleados_afectados = sum(n.n_empleados or 0 for n in noticias_despido)

    despidos_sector: dict = defaultdict(lambda: {'noticias': 0, 'empleados': 0})
    despidos_pais: dict = defaultdict(lambda: {'noticias': 0, 'empleados': 0})
    causa_counter: Counter = Counter()
    for n in noticias_despido:
        s = n.sector or 'Sin clasificar'
        despidos_sector[s]['noticias'] += 1
        despidos_sector[s]['empleados'] += n.n_empleados or 0
        p = n.pais or 'Sin especificar'
        despidos_pais[p]['noticias'] += 1
        despidos_pais[p]['empleados'] += n.n_empleados or 0
        if n.causa_ia:
            causa_counter[n.causa_ia] += 1

    noticias_positivas = (
        db.query(Noticia)
        .filter(Noticia.tipo_impacto.in_(TIPOS_POSITIVO))
        .order_by(Noticia.fecha_ingesta.desc())
        .all()
    )
    positivos_sector: dict = defaultdict(int)
    for n in noticias_positivas:
        positivos_sector[n.sector or 'Sin clasificar'] += 1

    # Vacantes activas (empleos IA disponibles ahora)
    total_vacantes = db.query(Vacante).count()
    vac_sector = (
        db.query(Vacante.sector, func.count(Vacante.id))
        .filter(Vacante.sector.isnot(None))
        .group_by(Vacante.sector)
        .order_by(func.count(Vacante.id).desc())
        .limit(12)
        .all()
    )
    vac_nivel = (
        db.query(Vacante.nivel_educativo, func.count(Vacante.id))
        .filter(Vacante.nivel_educativo.isnot(None))
        .group_by(Vacante.nivel_educativo)
        .all()
    )

    all_skills_rows = db.query(Vacante.skills).filter(Vacante.skills.isnot(None)).all()
    skills_counter: Counter = Counter()
    for (skills_json,) in all_skills_rows:
        try:
            skills_counter.update(s.strip() for s in json.loads(skills_json) if isinstance(s, str) and s.strip())
        except (json.JSONDecodeError, TypeError):
            pass

    # Ocupaciones ONET
    ocup_riesgo = db.query(Ocupacion).order_by(Ocupacion.p_automatizacion.desc()).limit(10).all()
    ocup_oportunidad = db.query(Ocupacion).order_by(Ocupacion.p_augmentacion.desc()).limit(10).all()

    def _ocup_out(o: Ocupacion) -> dict:
        return {
            "nombre": o.nombre,
            "p_automatizacion": float(o.p_automatizacion or 0),
            "p_augmentacion": float(o.p_augmentacion or 0),
            "sector": o.sector,
            "salario_mediana_usd": o.salario_mediana_usd,
        }

    return {
        "resumen": {
            "total_noticias_despido": len(noticias_despido),
            "total_empleados_afectados": total_empleados_afectados,
            "total_noticias_positivas": len(noticias_positivas),
            "total_vacantes_ia": total_vacantes,
        },
        "despidos_por_sector": sorted(
            [{"sector": k, **v} for k, v in despidos_sector.items()],
            key=lambda x: x["empleados"], reverse=True
        ),
        "despidos_por_pais": sorted(
            [{"pais": k, **v} for k, v in despidos_pais.items()],
            key=lambda x: x["noticias"], reverse=True
        )[:15],
        "despidos_por_causa_ia": [{"causa": k, "count": v} for k, v in causa_counter.most_common(10)],
        "top_eventos_despido": [
            {
                "id": n.id,
                "empresa": n.empresa,
                "titulo": n.titulo,
                "n_empleados": n.n_empleados,
                "sector": n.sector,
                "pais": n.pais,
                "causa_ia": n.causa_ia,
                "fecha": str(n.fecha_pub or n.fecha_ingesta or ""),
                "url": n.url,
            }
            for n in noticias_despido if (n.n_empleados or 0) > 0
        ][:15],
        "noticias_positivas_recientes": [
            {
                "id": n.id,
                "titulo": n.titulo,
                "empresa": n.empresa,
                "sector": n.sector,
                "tipo_impacto": n.tipo_impacto,
                "pais": n.pais,
                "fecha": str(n.fecha_pub or n.fecha_ingesta or ""),
                "url": n.url,
                "resumen": n.resumen_claude,
            }
            for n in noticias_positivas[:15]
        ],
        "positivos_por_sector": sorted(
            [{"sector": k, "noticias": v} for k, v in positivos_sector.items()],
            key=lambda x: x["noticias"], reverse=True
        ),
        "vacantes_por_sector": [{"sector": s, "count": c} for s, c in vac_sector],
        "vacantes_por_nivel_educativo": [{"nivel": n, "count": c} for n, c in vac_nivel],
        "top_skills_demandados": [
            {"skill": k, "count": v} for k, v in skills_counter.most_common(20)
        ],
        "ocupaciones_mayor_riesgo": [_ocup_out(o) for o in ocup_riesgo],
        "ocupaciones_mayor_oportunidad": [_ocup_out(o) for o in ocup_oportunidad],
    }


@router.get("/ies", response_model=list[IesOut])
def listar_ies_publico(q: Optional[str] = None, db: Session = Depends(get_db)):
    from sqlalchemy import func
    query = db.query(IES).filter_by(activa=True)
    if q:
        term = f"%{q.lower()}%"
        query = query.filter(
            func.lower(IES.nombre).like(term) |
            func.lower(IES.nombre_corto).like(term)
        )
    ies_list = query.order_by(IES.nombre).all()
    if not ies_list:
        return []
    ies_ids = [i.id for i in ies_list]
    conteos = dict(
        db.query(CarreraIES.ies_id, func.count(CarreraIES.id))
        .filter(CarreraIES.ies_id.in_(ies_ids))
        .group_by(CarreraIES.ies_id)
        .all()
    )
    return [
        IesOut(id=i.id, nombre=i.nombre, nombre_corto=i.nombre_corto, total_carreras=conteos.get(i.id, 0))
        for i in ies_list
    ]
