"""Email transaccional con Resend para alertas OIA-EE."""
import os
import structlog

logger = structlog.get_logger()

_RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
_FROM = os.getenv("EMAIL_FROM", "alertas@oia-ee.mx")


def _get_severity_emoji(severidad: str) -> str:
    return {"alta": "🔴", "media": "🟡", "baja": "🟢"}.get(severidad, "⚠️")


def send_alert_email(
    to: str,
    ies_nombre: str,
    carrera_nombre: str,
    severidad: str,
    mensaje: str,
    accion_sugerida: str,
) -> bool:
    """Envía alerta por email vía Resend. Retorna True si fue exitoso."""
    if not _RESEND_API_KEY:
        logger.warning("email_skipped", reason="RESEND_API_KEY no configurada")
        return False

    import resend
    resend.api_key = _RESEND_API_KEY

    emoji = _get_severity_emoji(severidad)
    subject = f"{emoji} Alerta {severidad.upper()} OIA-EE — {ies_nombre}"
    html = f"""
    <h2 style="color:#1e3a5f;">Alerta de Empleabilidad — OIA-EE</h2>
    <p><strong>Institución:</strong> {ies_nombre}</p>
    <p><strong>Carrera:</strong> {carrera_nombre}</p>
    <p><strong>Severidad:</strong> {emoji} {severidad.capitalize()}</p>
    <hr>
    <p><strong>Situación:</strong> {mensaje}</p>
    <p><strong>Acción sugerida:</strong> {accion_sugerida}</p>
    <hr>
    <p style="font-size:12px;color:#666;">
      OIA-EE — Observatorio de Impacto IA en Educación y Empleo<br>
      Para dejar de recibir alertas, contacta a tu administrador.
    </p>
    """
    try:
        resp = resend.Emails.send({
            "from": _FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("email_sent", to=to, ies=ies_nombre, severidad=severidad, id=resp.get("id"))
        return True
    except Exception as e:
        logger.error("email_failed", error=str(e), to=to)
        return False
