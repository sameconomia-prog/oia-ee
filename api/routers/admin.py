# api/routers/admin.py
import os
import logging
from fastapi import APIRouter, Header, HTTPException, Depends, status
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import CrearUsuarioIn, UsuarioOut
from pipeline.db.models import IES, Usuario
from pipeline.ingest_gdelt import run_gdelt_pipeline
from pipeline.jobs.alert_job import run_alert_job
from pipeline.jobs.news_ingest_job import run_news_ingest
from pipeline.jobs.kpi_snapshot_job import run_kpi_snapshot
from pipeline.seed_demo import run_seed_demo
from api.routers.publico import _clear_kpis_cache

logger = logging.getLogger(__name__)
router = APIRouter()

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _require_admin(x_admin_key: str = Header(None)) -> None:
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


class IngestResultOut(BaseModel):
    fetched: int
    stored: int
    classified: int
    embedded: int


class AlertJobResultOut(BaseModel):
    alertas_creadas: int


class NewsIngestResultOut(BaseModel):
    fetched: int
    stored: int
    classified: int


class SeedDemoResultOut(BaseModel):
    ies_creadas: int
    carreras_creadas: int
    ocupaciones: int
    noticias: int
    vacantes: int


class SnapshotResultOut(BaseModel):
    carreras_procesadas: int
    kpis_guardados: int
    kpis_actualizados: int


@router.post("/ingest/gdelt", response_model=IngestResultOut)
def ingest_gdelt(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    result = run_gdelt_pipeline(
        session=db,
        api_key_claude=os.getenv("ANTHROPIC_API_KEY", ""),
        api_key_voyage=os.getenv("VOYAGE_API_KEY", ""),
    )
    return IngestResultOut(**vars(result))


@router.post("/jobs/alertas", response_model=AlertJobResultOut)
def trigger_alert_job(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    creadas = run_alert_job(db)
    return AlertJobResultOut(alertas_creadas=creadas)


@router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    from pipeline.db.models import Carrera, CarreraIES, Alerta, Vacante, Noticia
    return {
        "ies": db.query(IES).count(),
        "carreras": db.query(Carrera).count(),
        "carrera_ies": db.query(CarreraIES).count(),
        "noticias": db.query(Noticia).count(),
        "vacantes": db.query(Vacante).count(),
        "alertas": db.query(Alerta).count(),
    }


@router.post("/ingest/noticias", response_model=NewsIngestResultOut)
def ingest_noticias(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    result = run_news_ingest(db)
    db.commit()
    return NewsIngestResultOut(**vars(result))


@router.post("/jobs/seed-demo", response_model=SeedDemoResultOut)
def seed_demo(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    result = run_seed_demo(db)
    _clear_kpis_cache()
    return SeedDemoResultOut(**vars(result))


@router.post("/jobs/kpi-snapshot", response_model=SnapshotResultOut)
def trigger_kpi_snapshot(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    result = run_kpi_snapshot(db)
    db.commit()
    _clear_kpis_cache()
    return SnapshotResultOut(**vars(result))


@router.post("/cache/clear")
def clear_cache(
    _: None = Depends(_require_admin),
):
    _clear_kpis_cache()
    return {"ok": True}


@router.get("/ies")
def listar_ies(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    from api.schemas import IesOut
    ies_list = db.query(IES).order_by(IES.nombre).all()
    return [IesOut(id=i.id, nombre=i.nombre, nombre_corto=i.nombre_corto) for i in ies_list]


@router.post("/usuarios", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    body: CrearUsuarioIn,
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    if not db.query(IES).filter_by(id=body.ies_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IES no encontrada")
    if db.query(Usuario).filter_by(username=body.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username ya existe")
    user = Usuario(
        username=body.username,
        hashed_password=_pwd.hash(body.password),
        ies_id=body.ies_id,
        email=body.email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
