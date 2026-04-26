# tests/radar/test_groq_classifier.py
import pytest
import json
from unittest.mock import patch, MagicMock
from pipeline.radar.groq_classifier import call_groq


def _mock_groq_response(text: str) -> MagicMock:
    choice = MagicMock()
    choice.message.content = text
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def test_call_groq_returns_text_on_success():
    with patch("pipeline.radar.groq_classifier.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.return_value = _mock_groq_response('{"empresa": "Acme"}')

        result = call_groq("prompt de prueba", api_key="test-key")

    assert result == '{"empresa": "Acme"}'


def test_call_groq_returns_none_on_exception():
    with patch("pipeline.radar.groq_classifier.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.side_effect = Exception("connection error")

        result = call_groq("prompt de prueba", api_key="test-key")

    assert result is None


def test_call_groq_uses_correct_model():
    with patch("pipeline.radar.groq_classifier.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.return_value = _mock_groq_response("null")

        call_groq("prompt", api_key="test-key")

        call_kwargs = instance.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "llama-3.1-8b-instant"
        assert call_kwargs.kwargs["max_tokens"] == 512
