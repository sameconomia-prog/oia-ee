# api/routers/pertinencia.py
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from api.deps import get_db, get_superadmin_user
from pipeline.db.models import SolicitudPertinencia

logger = logging.getLogger(__name__)
router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
NOTIFY_EMAIL = os.getenv("PERTINENCIA_NOTIFY_EMAIL", "sam.economia@gmail.com")


class SolicitudIn(BaseModel):
    nombre_contacto: str
    email_contacto: EmailStr
    ies_nombre: str
    carrera_nombre: str
    mensaje: str | None = None


class SolicitudOut(BaseModel):
    id: str
    nombre_contacto: str
    email_contacto: str
    ies_nombre: str
    carrera_nombre: str
    mensaje: str | None
    estado: str
    created_at: str

    model_config = {"from_attributes": True}


def _send_confirmation(email: str, nombre: str, ies: str, carrera: str) -> None:
    if not RESEND_API_KEY:
        return
    try:
        import httpx
        body = (
            f"<p>Hola {nombre},</p>"
            f"<p>Recibimos tu solicitud de Estudio de Pertinencia para <strong>{carrera}</strong> "
            f"en <strong>{ies}</strong>.</p>"
            "<p>Nuestro equipo se pondrá en contacto contigo en los próximos 2 días hábiles.</p>"
            "<p>— Equipo OIA-EE</p>"
        )
        notify_body = (
            f"<p>Nueva solicitud de pertinencia:</p>"
            f"<ul><li><b>Contacto:</b> {nombre} ({email})</li>"
            f"<li><b>IES:</b> {ies}</li>"
            f"<li><b>Carrera:</b> {carrera}</li></ul>"
        )
        headers = {"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"}
        httpx.post(
            "https://api.resend.com/emails",
            json={"from": "OIA-EE <noreply@oia-ee.mx>", "to": [email],
                  "subject": "Solicitud de Estudio de Pertinencia recibida — OIA-EE", "html": body},
            headers=headers, timeout=10,
        )
        httpx.post(
            "https://api.resend.com/emails",
            json={"from": "OIA-EE <noreply@oia-ee.mx>", "to": [NOTIFY_EMAIL],
                  "subject": f"[OIA-EE] Nueva solicitud pertinencia: {ies} / {carrera}", "html": notify_body},
            headers=headers, timeout=10,
        )
    except Exception as exc:
        logger.warning("pertinencia_email_failed", error=str(exc))


@router.post("/pertinencia/solicitud", status_code=status.HTTP_201_CREATED)
def crear_solicitud(body: SolicitudIn, db: Session = Depends(get_db)):
    sol = SolicitudPertinencia(
        nombre_contacto=body.nombre_contacto,
        email_contacto=body.email_contacto,
        ies_nombre=body.ies_nombre,
        carrera_nombre=body.carrera_nombre,
        mensaje=body.mensaje,
    )
    db.add(sol)
    db.commit()
    db.refresh(sol)
    _send_confirmation(body.email_contacto, body.nombre_contacto, body.ies_nombre, body.carrera_nombre)
    return {"id": sol.id, "estado": sol.estado}


@router.get("/pertinencia/solicitudes", dependencies=[Depends(get_superadmin_user)])
def listar_solicitudes(
    estado: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(SolicitudPertinencia)
    if estado:
        q = q.filter(SolicitudPertinencia.estado == estado)
    rows = q.order_by(SolicitudPertinencia.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "nombre_contacto": r.nombre_contacto,
            "email_contacto": r.email_contacto,
            "ies_nombre": r.ies_nombre,
            "carrera_nombre": r.carrera_nombre,
            "mensaje": r.mensaje,
            "estado": r.estado,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


class PatchSolicitudIn(BaseModel):
    estado: str


_ESTADO_EMAIL: dict[str, tuple[str, str]] = {
    "en_revision": (
        "Tu solicitud de pertinencia está en revisión — OIA-EE",
        "<p>Hola {nombre},</p>"
        "<p>Nuestro equipo ya está trabajando en el Estudio de Pertinencia para "
        "<strong>{carrera}</strong> en <strong>{ies}</strong>.</p>"
        "<p>Te enviaremos el reporte en los próximos días hábiles.</p>"
        "<p>— Equipo OIA-EE</p>",
    ),
    "completada": (
        "Tu Estudio de Pertinencia está listo — OIA-EE",
        "<p>Hola {nombre},</p>"
        "<p>Tu Estudio de Pertinencia para <strong>{carrera}</strong> en "
        "<strong>{ies}</strong> está terminado.</p>"
        "<p>Nuestro equipo se pondrá en contacto contigo hoy para enviarte el reporte PDF "
        "y agendar la sesión de presentación.</p>"
        "<p>— Equipo OIA-EE</p>",
    ),
    "rechazada": (
        "Actualización sobre tu solicitud — OIA-EE",
        "<p>Hola {nombre},</p>"
        "<p>Lamentablemente no pudimos procesar tu solicitud para <strong>{carrera}</strong> "
        "en este momento. Nuestro equipo se pondrá en contacto contigo para coordinar una solución.</p>"
        "<p>— Equipo OIA-EE</p>",
    ),
}


def _notify_estado_change(sol: SolicitudPertinencia, nuevo_estado: str) -> None:
    if not RESEND_API_KEY or nuevo_estado not in _ESTADO_EMAIL:
        return
    subject, body_tpl = _ESTADO_EMAIL[nuevo_estado]
    body = body_tpl.format(
        nombre=sol.nombre_contacto,
        carrera=sol.carrera_nombre,
        ies=sol.ies_nombre,
    )
    try:
        import httpx
        httpx.post(
            "https://api.resend.com/emails",
            json={
                "from": "OIA-EE <noreply@oia-ee.mx>",
                "to": [sol.email_contacto],
                "subject": subject,
                "html": body,
            },
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            timeout=10,
        )
    except Exception as exc:
        logger.warning("pertinencia_estado_notify_failed", error=str(exc))


@router.patch("/pertinencia/solicitudes/{solicitud_id}", dependencies=[Depends(get_superadmin_user)])
def actualizar_solicitud(
    solicitud_id: str,
    body: PatchSolicitudIn,
    db: Session = Depends(get_db),
):
    sol = db.query(SolicitudPertinencia).filter_by(id=solicitud_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    estados_validos = {"pendiente", "en_revision", "completada", "rechazada"}
    if body.estado not in estados_validos:
        raise HTTPException(status_code=422, detail=f"Estado debe ser uno de: {', '.join(estados_validos)}")
    prev_estado = sol.estado
    sol.estado = body.estado
    db.commit()
    if body.estado != prev_estado:
        _notify_estado_change(sol, body.estado)
    return {"id": sol.id, "estado": sol.estado}
