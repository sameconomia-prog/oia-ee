# tests/services/test_email_service.py
"""Tests para pipeline/services/email_service.py (implementación Resend)."""
from unittest.mock import patch
import importlib


def _reload_email_service():
    from pipeline.services import email_service
    importlib.reload(email_service)
    return email_service


def test_sin_resend_key_retorna_false(monkeypatch):
    """Sin RESEND_API_KEY configurada, retorna False."""
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    svc = _reload_email_service()
    result = svc.send_alert_email(
        to="rector@ies.mx",
        ies_nombre="UNAM",
        carrera_nombre="Derecho",
        severidad="alta",
        mensaje="D1=0.82",
        accion_sugerida="Actualizar plan de estudios",
    )
    assert result is False


def test_con_resend_key_envia_y_retorna_true(monkeypatch):
    """Con RESEND_API_KEY configurada, llama a resend.Emails.send y retorna True."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    svc = _reload_email_service()

    with patch("resend.Emails.send", return_value={"id": "abc123"}):
        result = svc.send_alert_email(
            to="rector@ies.mx",
            ies_nombre="UNAM",
            carrera_nombre="Derecho",
            severidad="alta",
            mensaje="D1=0.82",
            accion_sugerida="Actualizar plan de estudios",
        )
    assert result is True


def test_resend_error_retorna_false(monkeypatch):
    """Si resend.Emails.send lanza excepción, retorna False."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    svc = _reload_email_service()

    with patch("resend.Emails.send", side_effect=Exception("API error")):
        result = svc.send_alert_email(
            to="rector@ies.mx",
            ies_nombre="UNAM",
            carrera_nombre="Derecho",
            severidad="alta",
            mensaje="D1=0.82",
            accion_sugerida="Actualizar plan de estudios",
        )
    assert result is False


def test_severidad_media_envia_correctamente(monkeypatch):
    """Severidad media funciona sin errores."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    svc = _reload_email_service()

    with patch("resend.Emails.send", return_value={"id": "xyz789"}):
        result = svc.send_alert_email(
            to="rector@ies.mx",
            ies_nombre="IPN",
            carrera_nombre="Contabilidad",
            severidad="media",
            mensaje="D2=0.35",
            accion_sugerida="Revisar inserción laboral",
        )
    assert result is True
