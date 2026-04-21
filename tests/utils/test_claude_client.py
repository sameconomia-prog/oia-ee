import pytest
from unittest.mock import MagicMock, patch
from pipeline.utils.claude_client import ClaudeClient, NoticiasClassification

@pytest.fixture
def mock_anthropic(monkeypatch):
    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.content = [MagicMock(text='{"sector":"tecnologia","tipo_impacto":"despido_masivo","n_empleados_afectados":5000,"empresa":"Meta","causa_ia":"Automatización con LLMs","resumen":"Meta despide 5000 empleados por IA"}')]
    mock_msg.usage = MagicMock(input_tokens=100, output_tokens=50, cache_read_input_tokens=0, cache_creation_input_tokens=80)
    mock_client.messages.create.return_value = mock_msg
    monkeypatch.setattr("pipeline.utils.claude_client.anthropic.Anthropic", lambda **kw: mock_client)
    return mock_client

def test_classify_noticia(mock_anthropic):
    client = ClaudeClient(api_key="test-key")
    result = client.clasificar_noticia(
        titulo="Meta despide 5000 empleados por IA",
        contenido="Meta anunció hoy que elimina 5000 puestos debido a la automatización con modelos de lenguaje."
    )
    assert isinstance(result, NoticiasClassification)
    assert result.sector == "tecnologia"
    assert result.tipo_impacto == "despido_masivo"
    assert result.n_empleados_afectados == 5000
    assert result.empresa == "Meta"

def test_classify_returns_none_on_json_error(mock_anthropic):
    mock_anthropic.messages.create.return_value.content = [MagicMock(text="no es json valido")]
    client = ClaudeClient(api_key="test-key")
    result = client.clasificar_noticia("titulo", "contenido")
    assert result is None
