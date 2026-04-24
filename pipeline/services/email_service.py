import os
import logging
import smtplib
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


@dataclass
class AlertaResumen:
    carrera_nombre: str
    tipo: str
    severidad: str
    mensaje: str


_TIPO_LABELS = {
    "d1_alto": "D1 Obsolescencia alta",
    "d2_bajo": "D2 Oportunidades bajas",
    "ambos": "D1 alta + D2 baja",
}


def _smtp_config() -> dict | None:
    host = os.getenv("SMTP_HOST")
    if not host:
        return None
    return {
        "host": host,
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_addr": os.getenv("EMAIL_FROM", "noreply@oia-ee.mx"),
    }


def _build_html(ies_nombre: str, alertas: list[AlertaResumen]) -> str:
    filas = "".join(
        f"""
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px 12px;font-weight:600">{a.carrera_nombre}</td>
          <td style="padding:8px 12px">{_TIPO_LABELS.get(a.tipo, a.tipo)}</td>
          <td style="padding:8px 12px;color:{'#dc2626' if a.severidad=='alta' else '#d97706'}">{a.severidad.upper()}</td>
          <td style="padding:8px 12px;color:#6b7280;font-size:0.85em">{a.mensaje}</td>
        </tr>"""
        for a in alertas
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto">
  <div style="background:#4f46e5;padding:20px 24px">
    <h1 style="color:#fff;margin:0;font-size:1.25rem">OIA-EE · Alerta de KPI</h1>
    <p style="color:#c7d2fe;margin:4px 0 0;font-size:0.85rem">Observatorio de Indicadores · IA · Empleo · Educación</p>
  </div>
  <div style="padding:24px">
    <p>Se generaron <strong>{len(alertas)} alerta(s)</strong> para <strong>{ies_nombre}</strong>:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead>
        <tr style="background:#f3f4f6;text-align:left">
          <th style="padding:8px 12px">Carrera</th>
          <th style="padding:8px 12px">Indicador</th>
          <th style="padding:8px 12px">Severidad</th>
          <th style="padding:8px 12px">Detalle</th>
        </tr>
      </thead>
      <tbody>{filas}</tbody>
    </table>
    <p style="margin-top:20px;font-size:0.85rem;color:#6b7280">
      Ingresa al <a href="#" style="color:#4f46e5">Dashboard Rector</a> para revisar y marcar como leídas.
    </p>
  </div>
  <div style="background:#f9fafb;padding:12px 24px;font-size:0.75rem;color:#9ca3af">
    OIA-EE · Actualización diaria · Este mensaje se generó automáticamente.
  </div>
</body>
</html>"""


def send_alert_email(
    to_email: str,
    ies_nombre: str,
    alertas: list[AlertaResumen],
) -> bool:
    """Envía email de alertas. Retorna True si se envió, False si no hay config SMTP."""
    cfg = _smtp_config()
    if not cfg:
        logger.debug("SMTP no configurado — email omitido para %s", to_email)
        return False
    if not alertas:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"OIA-EE · {len(alertas)} alerta(s) nueva(s) — {ies_nombre}"
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_email

    plain = f"OIA-EE — {len(alertas)} alerta(s) para {ies_nombre}.\n" + "\n".join(
        f"• {a.carrera_nombre}: {_TIPO_LABELS.get(a.tipo, a.tipo)} ({a.severidad})"
        for a in alertas
    )
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(_build_html(ies_nombre, alertas), "html"))

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as server:
            server.starttls()
            if cfg["user"]:
                server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_addr"], to_email, msg.as_string())
        logger.info("Email enviado a %s (%d alertas)", to_email, len(alertas))
        return True
    except Exception as exc:
        logger.error("Error enviando email a %s: %s", to_email, exc)
        return False
