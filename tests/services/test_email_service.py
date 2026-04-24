# tests/services/test_email_service.py
from unittest.mock import patch, MagicMock
from pipeline.services.email_service import send_alert_email, AlertaResumen

ALERTAS = [
    AlertaResumen(carrera_nombre="Derecho", tipo="d1_alto", severidad="alta", mensaje="D1=0.82"),
    AlertaResumen(carrera_nombre="Contabilidad", tipo="d2_bajo", severidad="media", mensaje="D2=0.35"),
]


def test_sin_smtp_host_retorna_false(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    result = send_alert_email("rector@ies.mx", "UNAM", ALERTAS)
    assert result is False


def test_con_smtp_envia_y_retorna_true(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.test.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "user@test.com")
    monkeypatch.setenv("SMTP_PASSWORD", "secret")
    monkeypatch.setenv("EMAIL_FROM", "noreply@oia-ee.mx")

    mock_smtp = MagicMock()
    mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
    mock_smtp.__exit__ = MagicMock(return_value=False)

    with patch("pipeline.services.email_service.smtplib.SMTP", return_value=mock_smtp):
        result = send_alert_email("rector@ies.mx", "UNAM", ALERTAS)

    assert result is True
    mock_smtp.starttls.assert_called_once()
    mock_smtp.login.assert_called_once_with("user@test.com", "secret")
    mock_smtp.sendmail.assert_called_once()
    call_args = mock_smtp.sendmail.call_args
    assert "rector@ies.mx" in call_args[0]


def test_lista_vacia_retorna_false(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.test.com")
    result = send_alert_email("rector@ies.mx", "UNAM", [])
    assert result is False


def test_smtp_error_retorna_false(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.test.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "")
    monkeypatch.setenv("SMTP_PASSWORD", "")

    with patch("pipeline.services.email_service.smtplib.SMTP", side_effect=ConnectionRefusedError):
        result = send_alert_email("rector@ies.mx", "UNAM", ALERTAS)

    assert result is False
