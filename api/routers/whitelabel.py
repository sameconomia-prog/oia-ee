# api/routers/whitelabel.py
"""
P12 — White-label por dominio (Enterprise)
Permite a IES Enterprise personalizar nombre, logo y colores de la plataforma.
El frontend consulta GET /whitelabel/config para obtener la config por dominio.
"""
import re
import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.deps import get_db, get_superadmin_user
from pipeline.db.models_whitelabel import WhiteLabelConfig

logger = structlog.get_logger()
router = APIRouter()

_HEX_COLOR = re.compile(r'^#[0-9A-Fa-f]{6}$')


class WhiteLabelIn(BaseModel):
    ies_id: str
    dominio: str | None = None
    nombre_app: str | None = None
    logo_url: str | None = None
    color_primario: str | None = None
    color_acento: str | None = None
    footer_texto: str | None = None
    activo: bool = True


class WhiteLabelOut(BaseModel):
    ies_id: str
    dominio: str | None
    nombre_app: str | None
    logo_url: str | None
    color_primario: str | None
    color_acento: str | None
    footer_texto: str | None
    activo: bool

    model_config = {"from_attributes": True}


def _validate_colors(body: WhiteLabelIn) -> None:
    for field, val in [("color_primario", body.color_primario), ("color_acento", body.color_acento)]:
        if val and not _HEX_COLOR.match(val):
            raise HTTPException(status_code=422, detail=f"{field} debe ser un color hexadecimal válido (#RRGGBB)")


@router.post("/whitelabel/config", response_model=WhiteLabelOut, dependencies=[Depends(get_superadmin_user)])
def crear_o_actualizar_config(body: WhiteLabelIn, db: Session = Depends(get_db)):
    """Crea o actualiza la configuración white-label de una IES (superadmin)."""
    _validate_colors(body)
    existing = db.query(WhiteLabelConfig).filter_by(ies_id=body.ies_id).first()
    if existing:
        for field in ("dominio", "nombre_app", "logo_url", "color_primario", "color_acento", "footer_texto", "activo"):
            val = getattr(body, field)
            if val is not None:
                setattr(existing, field, val)
        existing.actualizado_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing
    cfg = WhiteLabelConfig(**body.model_dump())
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    logger.info("whitelabel_created", ies_id=body.ies_id, dominio=body.dominio)
    return cfg


@router.get("/whitelabel/config", response_model=WhiteLabelOut | None)
def obtener_config(request: Request, ies_id: str | None = None, db: Session = Depends(get_db)):
    """
    Devuelve la config white-label para:
    - ?ies_id= (consulta directa por IES)
    - Host header (para SaaS multi-dominio: la IES usa su propio dominio)
    Retorna null si no hay config activa — el frontend cae al branding OIA-EE.
    """
    if ies_id:
        cfg = db.query(WhiteLabelConfig).filter_by(ies_id=ies_id, activo=True).first()
        return cfg

    host = request.headers.get("host", "").split(":")[0]
    if host and host not in ("localhost", "oia-ee.com", "oia-ee.vercel.app"):
        cfg = db.query(WhiteLabelConfig).filter_by(dominio=host, activo=True).first()
        return cfg
    return None


@router.get("/whitelabel/configs", dependencies=[Depends(get_superadmin_user)])
def listar_configs(db: Session = Depends(get_db)):
    """Lista todas las configuraciones white-label (superadmin)."""
    rows = db.query(WhiteLabelConfig).order_by(WhiteLabelConfig.creado_at.desc()).all()
    return [
        {
            "id": r.id,
            "ies_id": r.ies_id,
            "dominio": r.dominio,
            "nombre_app": r.nombre_app,
            "logo_url": r.logo_url,
            "color_primario": r.color_primario,
            "color_acento": r.color_acento,
            "activo": r.activo,
            "creado_at": r.creado_at.isoformat() if r.creado_at else None,
        }
        for r in rows
    ]


@router.delete("/whitelabel/config/{ies_id}", dependencies=[Depends(get_superadmin_user)])
def eliminar_config(ies_id: str, db: Session = Depends(get_db)):
    """Elimina la configuración white-label de una IES (superadmin)."""
    cfg = db.query(WhiteLabelConfig).filter_by(ies_id=ies_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    db.delete(cfg)
    db.commit()
    return {"ok": True, "ies_id": ies_id}
