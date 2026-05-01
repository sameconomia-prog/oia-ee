"""Helpers para registrar ejecuciones del scheduler y enviar alertas por email."""
from __future__ import annotations
import os
from datetime import datetime, timezone

import resend
import structlog
from sqlalchemy import desc

from pipeline.db import get_session
from pipeline.db.models import PipelineRun

logger = structlog.get_logger()

_FROM = os.getenv("EMAIL_FROM", "alertas@oia-ee.mx")
_TO = "sam.economia@gmail.com"


def _write_pipeline_run(job_id: str, status: str, message: str = "") -> None:
    """Registra el resultado de una ejecución. Abre su propia sesión para
    no depender de la sesión del job (que puede haber fallado)."""
    with get_session() as session:
        run = PipelineRun(
            job_id=job_id,
            ran_at=datetime.now(timezone.utc),
            status=status,
            message=message[:2000] if message else "",
        )
        session.add(run)


def _get_previous_status(job_id: str) -> str | None:
    """Retorna el status de la última ejecución registrada para job_id, o None."""
    with get_session() as session:
        prev = (
            session.query(PipelineRun)
            .filter(PipelineRun.job_id == job_id)
            .order_by(desc(PipelineRun.ran_at), desc(PipelineRun.id))
            .first()
        )
        return prev.status if prev else None


def _send_alert_email(job_id: str, error: Exception, traceback_str: str = "") -> None:
    """Envía alerta solo en transición ok→error (deduplicado)."""
    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend.api_key:
        logger.warning("RESEND_API_KEY no configurado, email omitido", job_id=job_id)
        return

    params: resend.Emails.SendParams = {
        "from": f"OIA-EE Monitoring <{_FROM}>",
        "to": [_TO],
        "subject": f"[OIA-EE] ⚠️ Job falló: {job_id}",
        "text": (
            f"El job '{job_id}' falló.\n\n"
            f"Error: {error}\n\n"
            f"Traceback:\n{traceback_str}"
        ),
    }
    try:
        resend.Emails.send(params)
        logger.info("Alert email enviado", job_id=job_id)
    except Exception as e:
        logger.error("Error enviando alert email", job_id=job_id, error=str(e))


def _send_recovery_email(job_id: str) -> None:
    """Notifica que un job se recuperó después de un error."""
    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend.api_key:
        return

    params: resend.Emails.SendParams = {
        "from": f"OIA-EE Monitoring <{_FROM}>",
        "to": [_TO],
        "subject": f"[OIA-EE] ✅ Job recuperado: {job_id}",
        "text": f"El job '{job_id}' se ejecutó exitosamente después de un error previo.",
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error("Error enviando recovery email", job_id=job_id, error=str(e))


def notify_job_result(job_id: str, error: Exception | None, traceback_str: str | None = None) -> None:
    """Registra el resultado de un job y envía email solo en transición de estado (ok→error o error→ok)."""
    prev_status = _get_previous_status(job_id)

    if error is None:
        _write_pipeline_run(job_id, "ok")
        if prev_status == "error":
            _send_recovery_email(job_id)
    else:
        _write_pipeline_run(job_id, "error", str(error))
        if prev_status != "error":
            _send_alert_email(job_id, error, traceback_str or "")
