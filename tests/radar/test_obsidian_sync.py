# tests/radar/test_obsidian_sync.py
import pytest
import tempfile
import types
from pathlib import Path
from datetime import date
from pipeline.radar.obsidian_sync import generate_despido_note, sync_despido_to_obsidian
from pipeline.db.models_radar import EventoIADespido


def _make_evento():
    """Crea un objeto duck-typed que simula EventoIADespido sin requerir sesión SQLAlchemy."""
    ev = types.SimpleNamespace()
    ev.id = "test-001"
    ev.empresa = "Samsung Electronics"
    ev.sector = "manufactura"
    ev.pais = "KR"
    ev.fecha_anuncio = date(2025, 4, 20)
    ev.fecha_captura = date(2025, 4, 21)
    ev.numero_despidos = 2000
    ev.salario_promedio_usd = 60000.0
    ev.ahorro_anual_usd = 120_000_000.0
    ev.ia_tecnologia = "Vision AI"
    ev.area_reemplazada = "control de calidad"
    ev.fuente_url = "https://reuters.com/samsung-layoffs"
    ev.fuente_nombre = "Reuters"
    ev.confiabilidad = "alta"
    ev.resumen_haiku = "Samsung reemplazó operadores de QA con Vision AI propio."
    return ev


def test_generate_despido_note_contains_required_fields():
    evento = _make_evento()
    note = generate_despido_note(evento)

    assert "Samsung Electronics" in note
    assert "https://reuters.com/samsung-layoffs" in note
    assert "2025-04-20" in note
    assert "2025-04-21" in note
    assert "Vision AI" in note
    assert "alta" in note
    assert "---" in note  # frontmatter YAML


def test_generate_despido_note_has_valid_yaml_frontmatter():
    import yaml
    evento = _make_evento()
    note = generate_despido_note(evento)
    parts = note.split("---")
    assert len(parts) >= 3
    frontmatter = yaml.safe_load(parts[1])
    assert frontmatter["fuente_url"] == "https://reuters.com/samsung-layoffs"
    assert frontmatter["fecha_anuncio"] == "2025-04-20"
    assert frontmatter["tipo"] == "despido_ia"


def test_sync_despido_to_obsidian_creates_file():
    evento = _make_evento()
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = sync_despido_to_obsidian(evento, vault_base=str(tmpdir))
        assert Path(filepath).exists()
        content = Path(filepath).read_text()
        assert "Samsung Electronics" in content
        assert "https://reuters.com/samsung-layoffs" in content
