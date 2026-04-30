# api/routers/leads.py
import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from api.deps import get_db
from pipeline.db.models import Lead

logger = logging.getLogger(__name__)
router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
NOTIFY_EMAIL = os.getenv("LEADS_NOTIFY_EMAIL", "sam.economia@gmail.com")
FROM_EMAIL = os.getenv("EMAIL_FROM", "alertas@oia-ee.mx")


class LeadIn(BaseModel):
    nombre: str
    cargo: str | None = None
    ies_nombre: str
    email: EmailStr
    telefono: str | None = None
    mensaje: str | None = None
    origen: str = "demo"


class LeadOut(BaseModel):
    id: str
    nombre: str
    cargo: str | None
    ies_nombre: str
    email: str
    telefono: str | None
    mensaje: str | None
    origen: str
    estado: str
    created_at: str | None

    model_config = {"from_attributes": True}


def _notify_admin(lead: Lead) -> None:
    if not RESEND_API_KEY:
        return
    try:
        import httpx
        html = (
            f"<p>Nuevo lead registrado en OIA-EE:</p>"
            f"<ul>"
            f"<li><b>Nombre:</b> {lead.nombre}</li>"
            f"<li><b>Cargo:</b> {lead.cargo or '—'}</li>"
            f"<li><b>Institución:</b> {lead.ies_nombre}</li>"
            f"<li><b>Email:</b> {lead.email}</li>"
            f"<li><b>Teléfono:</b> {lead.telefono or '—'}</li>"
            f"<li><b>Origen:</b> {lead.origen}</li>"
            f"<li><b>Mensaje:</b> {lead.mensaje or '—'}</li>"
            f"</ul>"
        )
        httpx.post(
            "https://api.resend.com/emails",
            json={
                "from": FROM_EMAIL,
                "to": [NOTIFY_EMAIL],
                "subject": f"[OIA-EE] Nuevo lead: {lead.nombre} — {lead.ies_nombre}",
                "html": html,
            },
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            timeout=10,
        )
    except Exception as exc:
        logger.warning("lead_notify_failed", error=str(exc))


@router.post("/leads", status_code=201)
def crear_lead(body: LeadIn, db: Session = Depends(get_db)):
    lead = Lead(
        nombre=body.nombre,
        cargo=body.cargo,
        ies_nombre=body.ies_nombre,
        email=body.email,
        telefono=body.telefono,
        mensaje=body.mensaje,
        origen=body.origen,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    _notify_admin(lead)
    return {"id": lead.id, "estado": lead.estado}


@router.get("/leads")
def listar_leads(
    estado: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    x_admin_key: str | None = None,
):
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    q = db.query(Lead)
    if estado:
        q = q.filter(Lead.estado == estado)
    rows = q.order_by(Lead.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "nombre": r.nombre,
            "cargo": r.cargo,
            "ies_nombre": r.ies_nombre,
            "email": r.email,
            "telefono": r.telefono,
            "mensaje": r.mensaje,
            "origen": r.origen,
            "estado": r.estado,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


class PatchLeadIn(BaseModel):
    estado: str


@router.patch("/leads/{lead_id}")
def actualizar_lead(
    lead_id: str,
    body: PatchLeadIn,
    db: Session = Depends(get_db),
    x_admin_key: str | None = None,
):
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    lead = db.query(Lead).filter_by(id=lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    estados_validos = {"nuevo", "contactado", "calificado", "cerrado", "descartado"}
    if body.estado not in estados_validos:
        raise HTTPException(status_code=422, detail=f"Estado inválido. Válidos: {', '.join(estados_validos)}")
    lead.estado = body.estado
    db.commit()
    return {"id": lead.id, "estado": lead.estado}
