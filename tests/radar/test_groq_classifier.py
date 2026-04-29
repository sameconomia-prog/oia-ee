# tests/radar/test_groq_classifier.py
from unittest.mock import patch, MagicMock
from pipeline.radar.groq_classifier import call_groq


def test_call_groq_returns_text_on_success():
    with patch("pipeline.radar.groq_classifier.FallbackClient") as MockClient:
        MockClient.return_value.chat.return_value = '{"empresa": "Acme"}'
        result = call_groq("prompt de prueba", api_key="test-key")
    assert result == '{"empresa": "Acme"}'


def test_call_groq_returns_none_on_exception():
    with patch("pipeline.radar.groq_classifier.FallbackClient") as MockClient:
        MockClient.return_value.chat.side_effect = RuntimeError("todos fallaron")
        result = call_groq("prompt de prueba", api_key="test-key")
    assert result is None


def test_call_groq_pasa_prompt_al_cliente():
    with patch("pipeline.radar.groq_classifier.FallbackClient") as MockClient:
        MockClient.return_value.chat.return_value = "null"
        call_groq("mi prompt específico", api_key="test-key")
        MockClient.return_value.chat.assert_called_once_with("mi prompt específico", system="")
