"""Genera y envía resumen semanal ejecutivo a todos los admin_ies activos."""
from __future__ import annotations
import os
import structlog
from datetime import date
from sqlalchemy.orm import Session

from pipeline.db.models import Usuario, IES, Alerta, CarreraIES, Carrera
from pipeline.kpi_engine.kpi_runner import run_kpis_carrera

logger = structlog.get_logger()

_RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
_FROM = os.getenv("EMAIL_FROM", "alertas@oia-ee.mx")


def _kpi_row(nombre: str, d1: float | None, d2: float | None) -> str:
    d1s = f"{d1:.2f}" if d1 is not None else "—"
    d2s = f"{d2:.2f}" if d2 is not None else "—"
    d1_color = "#dc2626" if d1 and d1 >= 0.7 else "#f59e0b" if d1 and d1 >= 0.4 else "#10b981"
    d2_color = "#10b981" if d2 and d2 >= 0.6 else "#f59e0b" if d2 and d2 >= 0.4 else "#dc2626"
    return f"""
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:8px 12px;color:#1e293b;font-size:13px;">{nombre}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:bold;color:{d1_color};">{d1s}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:bold;color:{d2_color};">{d2s}</td>
    </tr>"""


def _build_html(ies_nombre: str, carreras_kpis: list[dict], alertas: list[Alerta], semana: str) -> str:
    filas = "".join(
        _kpi_row(c["nombre"], c.get("d1"), c.get("d2"))
        for c in carreras_kpis[:15]
    )
    alertas_html = ""
    if alertas:
        items = "".join(
            f'<li style="margin-bottom:6px;"><strong>{a.carrera_nombre}</strong> — {a.mensaje or a.titulo} '
            f'<span style="color:{"#dc2626" if a.severidad=="alta" else "#f59e0b"};font-weight:bold;">({a.severidad.upper()})</span></li>'
            for a in alertas[:10]
        )
        alertas_html = f'<h3 style="color:#dc2626;margin-top:24px;">⚠️ Alertas activas ({len(alertas)})</h3><ul style="padding-left:20px;">{items}</ul>'

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="background:linear-gradient(135deg,#312e81,#4f46e5);padding:24px;border-radius:12px;margin-bottom:24px;">
    <h1 style="color:white;margin:0;font-size:20px;">OIA-EE · Resumen Semanal</h1>
    <p style="color:#c7d2fe;margin:4px 0 0;font-size:13px;">{ies_nombre} · Semana del {semana}</p>
  </div>

  <h2 style="color:#312e81;border-bottom:2px solid #e0e7ff;padding-bottom:8px;">KPIs por Carrera</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr style="background:#e0e7ff;">
        <th style="padding:10px 12px;text-align:left;color:#312e81;">Carrera</th>
        <th style="padding:10px 12px;text-align:center;color:#312e81;">D1 Riesgo</th>
        <th style="padding:10px 12px;text-align:center;color:#312e81;">D2 Oportunidad</th>
      </tr>
    </thead>
    <tbody>{filas}</tbody>
  </table>
  <p style="font-size:11px;color:#94a3b8;margin-top:4px;">D1: &lt;0.4=verde, 0.4-0.7=ámbar, &gt;0.7=rojo (mayor = mayor riesgo) · D2: inverso</p>

  {alertas_html}

  <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:24px;font-size:12px;color:#64748b;">
    <p style="margin:0;">Este resumen fue generado automáticamente por <strong>OIA-EE</strong>. Para ver el dashboard completo visita
    <a href="https://oia-ee.vercel.app/rector" style="color:#4f46e5;">oia-ee.vercel.app</a>.</p>
    <p style="margin:4px 0 0;">Para darte de baja de este resumen, responde este correo con "BAJA".</p>
  </div>
</body></html>"""


def send_resumen_semanal(db: Session) -> dict:
    """Envía resumen semanal a todos los admin_ies activos con email configurado."""
    if not _RESEND_API_KEY:
        logger.warning("resumen_semanal_skipped", reason="RESEND_API_KEY no configurada")
        return {"enviados": 0, "skipped": "no api key"}

    import resend
    resend.api_key = _RESEND_API_KEY

    semana = date.today().strftime("%d/%m/%Y")
    enviados = 0
    errores = 0

    # Todos los admin_ies activos con email
    admins = (
        db.query(Usuario)
        .filter(Usuario.activo.is_(True), Usuario.email.isnot(None))
        .filter(Usuario.rol.in_(["admin_ies", "superadmin"]))
        .all()
    )

    ies_cache: dict[str, IES] = {}
    for admin in admins:
        try:
            ies = ies_cache.get(admin.ies_id)
            if not ies:
                ies = db.query(IES).filter_by(id=admin.ies_id).first()
                if ies:
                    ies_cache[admin.ies_id] = ies

            if not ies:
                continue

            # KPIs de carreras de esta IES
            carrera_ies_list = db.query(CarreraIES).filter_by(ies_id=admin.ies_id).all()
            carreras_kpis = []
            for ci in carrera_ies_list[:20]:
                carrera = db.query(Carrera).filter_by(id=ci.carrera_id).first()
                if not carrera:
                    continue
                try:
                    res = run_kpis_carrera(ci.carrera_id, admin.ies_id, db)
                    carreras_kpis.append({
                        "nombre": carrera.nombre_norm,
                        "d1": res.d1_obsolescencia.score if res and res.d1_obsolescencia else None,
                        "d2": res.d2_oportunidades.score if res and res.d2_oportunidades else None,
                    })
                except Exception:
                    carreras_kpis.append({"nombre": carrera.nombre_norm})

            # Alertas no leídas
            alertas = (
                db.query(Alerta)
                .filter_by(ies_id=admin.ies_id, leida=False)
                .order_by(Alerta.fecha.desc())
                .limit(10)
                .all()
            )

            html = _build_html(ies.nombre, carreras_kpis, alertas, semana)
            resend.Emails.send({
                "from": _FROM,
                "to": [admin.email],
                "subject": f"📊 OIA-EE — Resumen Semanal · {ies.nombre_corto or ies.nombre}",
                "html": html,
            })
            enviados += 1
            logger.info("resumen_semanal_enviado", to=admin.email, ies=ies.nombre)

        except Exception as exc:
            errores += 1
            logger.error("resumen_semanal_error", to=admin.email, error=str(exc))

    return {"enviados": enviados, "errores": errores}
