"""Tests para pipeline/services/email_service.py"""
from unittest.mock import patch


def test_send_alert_email_success(monkeypatch):
    """Con RESEND_API_KEY configurada, llama a resend.Emails.send y retorna True."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    from pipeline.services import email_service
    import importlib
    importlib.reload(email_service)

    with patch("resend.Emails.send", return_value={"id": "abc123"}) as mock_send:
        result = email_service.send_alert_email(
            to="rector@universidad.edu.mx",
            ies_nombre="Universidad Test",
            carrera_nombre="Ingeniería en Sistemas",
            severidad="alta",
            mensaje="D1 supera 0.80 — riesgo crítico de obsolescencia",
            accion_sugerida="Actualizar plan de estudios con habilidades en IA",
        )
        assert result is True
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        assert call_args["to"] == ["rector@universidad.edu.mx"]
        assert "alta" in call_args["subject"].lower() or "alerta" in call_args["subject"].lower()


def test_send_alert_email_returns_false_on_missing_key(monkeypatch):
    """Sin RESEND_API_KEY, retorna False en lugar de lanzar excepción."""
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    from pipeline.services import email_service
    import importlib
    importlib.reload(email_service)

    result = email_service.send_alert_email(
        to="test@test.com",
        ies_nombre="IES",
        carrera_nombre="Carrera",
        severidad="media",
        mensaje="Test",
        accion_sugerida="Test",
    )
    assert result is False
