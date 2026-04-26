# tests/radar/test_extractor.py
import pytest
import json
from unittest.mock import patch, MagicMock
from pipeline.radar.extractor import extract_despido_event, extract_empleo_event, ExtractedDespido, ExtractedEmpleo


NOTICIA_DESPIDO = """
Samsung Electronics announced Tuesday that it will lay off 2,000 factory
workers at its South Korea semiconductor plant, replacing quality control
inspectors with its proprietary Vision AI system. The move is expected to
save approximately $120 million annually. The affected workers earned an
average of $60,000 per year.
"""

NOTICIA_EMPLEO = """
OpenAI is hiring 500 AI Safety researchers and prompt engineers in San Francisco,
offering salaries between $180,000 and $350,000. Required skills include
Python, RLHF, and large language model evaluation. These are permanent positions.
"""


def test_extract_despido_event_returns_structured_data():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps({
        "empresa": "Samsung Electronics",
        "pais": "KR",
        "sector": "manufactura",
        "fecha_anuncio": "2025-04-20",
        "numero_despidos": 2000,
        "salario_promedio_usd": 60000,
        "ia_tecnologia": "Vision AI",
        "area_reemplazada": "control de calidad",
        "rango_min_despidos": None,
        "rango_max_despidos": None,
        "porcentaje_fuerza_laboral": None,
        "es_reemplazo_total": True,
        "confiabilidad": "alta",
    }))]

    with patch("anthropic.Anthropic") as MockClient:
        mock_client = MockClient.return_value
        mock_client.messages.create.return_value = mock_response

        result = extract_despido_event(NOTICIA_DESPIDO, api_key="test-key")

    assert isinstance(result, ExtractedDespido)
    assert result.empresa == "Samsung Electronics"
    assert result.pais == "KR"
    assert result.numero_despidos == 2000
    assert result.confiabilidad == "alta"


def test_extract_despido_returns_none_on_invalid_json():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="No es JSON válido")]

    with patch("anthropic.Anthropic") as MockClient:
        mock_client = MockClient.return_value
        mock_client.messages.create.return_value = mock_response

        result = extract_despido_event("Artículo sin datos relevantes", api_key="test-key")

    assert result is None


def test_extract_empleo_event_returns_structured_data():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps({
        "empresa": "OpenAI",
        "pais": "US",
        "sector": "tecnología",
        "fecha_anuncio": "2025-04-18",
        "numero_empleos": 500,
        "tipo_contrato": "permanente",
        "titulo_puesto": "AI Safety Researcher / Prompt Engineer",
        "habilidades_requeridas": ["Python", "RLHF", "LLMs"],
        "salario_min_usd": 180000,
        "salario_max_usd": 350000,
        "ia_tecnologia_usada": "GPT-4",
        "confiabilidad": "alta",
    }))]

    with patch("anthropic.Anthropic") as MockClient:
        mock_client = MockClient.return_value
        mock_client.messages.create.return_value = mock_response

        result = extract_empleo_event(NOTICIA_EMPLEO, api_key="test-key")

    assert isinstance(result, ExtractedEmpleo)
    assert result.empresa == "OpenAI"
    assert result.numero_empleos == 500
    assert "Python" in result.habilidades_requeridas
