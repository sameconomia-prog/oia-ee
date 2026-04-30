import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from api.deps import get_db
from pipeline.db.models import Contacto

logger = logging.getLogger(__name__)
router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
NOTIFY_EMAIL = os.getenv("LEADS_NOTIFY_EMAIL", "sam.economia@gmail.com")
FROM_EMAIL = os.getenv("EMAIL_FROM", "alertas@oia-ee.mx")


class ContactoIn(BaseModel):
    tipo: str                        # 'ies' | 'gobierno'
    nombre: str
    cargo: str | None = None
    institucion: str
    email: EmailStr
    area_interes: str | None = None
    mensaje: str | None = None


def _notify_admin(c: Contacto) -> None:
    if not RESEND_API_KEY:
        return
    tipo_label = "IES" if c.tipo == "ies" else "Gobierno / Investigador"
    try:
        import httpx
        html = (
            f"<p>Nuevo contacto desde el landing de OIA-EE ({tipo_label}):</p><ul>"
            f"<li><b>Nombre:</b> {c.nombre}</li>"
            f"<li><b>Cargo:</b> {c.cargo or '—'}</li>"
            f"<li><b>Institución:</b> {c.institucion}</li>"
            f"<li><b>Email:</b> {c.email}</li>"
            f"<li><b>Área de interés:</b> {c.area_interes or '—'}</li>"
            f"<li><b>Mensaje:</b> {c.mensaje or '—'}</li>"
            f"</ul>"
        )
        httpx.post(
            "https://api.resend.com/emails",
            json={
                "from": FROM_EMAIL,
                "to": [NOTIFY_EMAIL],
                "subject": f"[OIA-EE] Nuevo contacto ({tipo_label}): {c.nombre} — {c.institucion}",
                "html": html,
            },
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            timeout=10,
        )
    except Exception as exc:
        logger.warning("contacto_notify_failed", error=str(exc))


@router.post("/contacto", status_code=201)
def crear_contacto(body: ContactoIn, db: Session = Depends(get_db)):
    if body.tipo not in ("ies", "gobierno"):
        raise HTTPException(status_code=422, detail="tipo debe ser 'ies' o 'gobierno'")
    contacto = Contacto(
        tipo=body.tipo,
        nombre=body.nombre,
        cargo=body.cargo,
        institucion=body.institucion,
        email=body.email,
        area_interes=body.area_interes,
        mensaje=body.mensaje,
    )
    db.add(contacto)
    db.commit()
    db.refresh(contacto)
    _notify_admin(contacto)
    return {"id": contacto.id, "estado": contacto.estado}


@router.get("/contacto")
def listar_contactos(
    tipo: str | None = None,
    estado: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    x_admin_key: str | None = None,
):
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    q = db.query(Contacto)
    if tipo:
        q = q.filter(Contacto.tipo == tipo)
    if estado:
        q = q.filter(Contacto.estado == estado)
    rows = q.order_by(Contacto.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "tipo": r.tipo,
            "nombre": r.nombre,
            "cargo": r.cargo,
            "institucion": r.institucion,
            "email": r.email,
            "area_interes": r.area_interes,
            "mensaje": r.mensaje,
            "estado": r.estado,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
