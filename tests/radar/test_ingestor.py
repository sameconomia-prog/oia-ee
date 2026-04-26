# tests/radar/test_ingestor.py
import pytest
from unittest.mock import patch, MagicMock
from datetime import date
from pipeline.radar.ingestor import run_radar_ingestion, IngestResult
from pipeline.radar.extractor import ExtractedDespido, ExtractedEmpleo


def test_run_radar_ingestion_returns_result(session):
    """El ingestor devuelve un IngestResult con conteos."""
    mock_despido = ExtractedDespido(
        empresa="Test Corp",
        pais="US",
        sector="tecnología",
        fecha_anuncio="2025-04-20",
        numero_despidos=100,
        salario_promedio_usd=50000,
        ia_tecnologia="ChatGPT",
        area_reemplazada="customer service",
        confiabilidad="alta",
    )

    with patch("pipeline.radar.ingestor.fetch_grok_news") as mock_grok, \
         patch("pipeline.radar.ingestor.fetch_newsapi_articles") as mock_news, \
         patch("pipeline.radar.ingestor.extract_despido_event") as mock_extract:

        mock_grok.return_value = [MagicMock(resumen="Samsung lays off...", url="https://t.com/1", fecha="2025-04-20", fuente="Reuters", titulo="Test")]
        mock_news.return_value = []
        mock_extract.return_value = mock_despido

        result = run_radar_ingestion(db=session, tipo="despidos")

    assert isinstance(result, IngestResult)
    assert result.procesados >= 0
    assert result.insertados >= 0
    assert result.errores >= 0


def test_run_radar_ingestion_skips_duplicates(session):
    """El ingestor no inserta el mismo fuente_url dos veces."""
    from pipeline.db.models_radar import EventoIADespido
    existing = EventoIADespido(
        empresa="Existing Corp",
        pais="US",
        fecha_anuncio=date.today(),
        fuente_url="https://duplicate.com/article1",
        fuente_nombre="Test",
        confiabilidad="alta",
    )
    session.add(existing)
    session.flush()

    mock_despido = ExtractedDespido(
        empresa="New Corp",
        pais="US",
        sector="retail",
        fecha_anuncio="2025-04-20",
        confiabilidad="media",
    )
    with patch("pipeline.radar.ingestor.fetch_grok_news") as mock_grok, \
         patch("pipeline.radar.ingestor.fetch_newsapi_articles") as mock_news, \
         patch("pipeline.radar.ingestor.extract_despido_event") as mock_extract:

        mock_grok.return_value = [MagicMock(resumen="...", url="https://duplicate.com/article1", fecha="2025-04-20", fuente="Test", titulo="Dup")]
        mock_news.return_value = []
        mock_extract.return_value = mock_despido

        result = run_radar_ingestion(db=session, tipo="despidos")

    assert result.duplicados >= 1
