# api/routers/admin.py
import os
import logging
from fastapi import APIRouter, Header, HTTPException, Depends, status
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from api.deps import get_db, get_superadmin_user
from api.schemas import CrearUsuarioIn, UsuarioOut
from pipeline.db.models import IES, Usuario
from pipeline.ingest_gdelt import run_gdelt_pipeline
from pipeline.jobs.alert_job import run_alert_job
from pipeline.jobs.news_ingest_job import run_news_ingest
from pipeline.jobs.kpi_snapshot_job import run_kpi_snapshot
from pipeline.seed_demo import run_seed_demo
from api.routers.publico import _clear_kpis_cache
from api.benchmarks_loader import load_benchmarks

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
    load_benchmarks.cache_clear()
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


# ── Gestión de usuarios (JWT superadmin) ─────────────────────────────────


class PatchUsuarioIn(BaseModel):
    rol: str | None = None
    activo: bool | None = None
    email: str | None = None


@router.get("/usuarios/list", response_model=list[UsuarioOut])
def listar_usuarios_jwt(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_superadmin_user),
):
    """Lista todos los usuarios (superadmin via JWT)."""
    return db.query(Usuario).order_by(Usuario.ies_id, Usuario.username).all()


@router.post("/usuarios/crear", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario_jwt(
    body: CrearUsuarioIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_superadmin_user),
):
    """Crea usuario (superadmin via JWT)."""
    if not db.query(IES).filter_by(id=body.ies_id).first():
        raise HTTPException(status_code=404, detail="IES no encontrada")
    if db.query(Usuario).filter_by(username=body.username).first():
        raise HTTPException(status_code=409, detail="Username ya existe")
    user = Usuario(
        username=body.username,
        hashed_password=_pwd.hash(body.password),
        ies_id=body.ies_id,
        email=body.email,
        rol=body.rol if hasattr(body, "rol") and body.rol else "admin_ies",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioOut)
def actualizar_usuario(
    usuario_id: str,
    body: PatchUsuarioIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_superadmin_user),
):
    """Actualiza rol/activo/email de un usuario (superadmin via JWT)."""
    user = db.query(Usuario).filter_by(id=usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    ROLES_VALIDOS = {"viewer", "researcher", "admin_ies", "superadmin"}
    if body.rol is not None:
        if body.rol not in ROLES_VALIDOS:
            raise HTTPException(status_code=422, detail=f"Rol inválido. Válidos: {ROLES_VALIDOS}")
        user.rol = body.rol
    if body.activo is not None:
        user.activo = body.activo
    if body.email is not None:
        user.email = body.email
    db.commit()
    db.refresh(user)
    return user


@router.post("/resumen-semanal/trigger")
def trigger_resumen_semanal(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin),
):
    """Dispara el envío del resumen semanal manualmente."""
    from pipeline.services.resumen_semanal import send_resumen_semanal
    return send_resumen_semanal(db)
