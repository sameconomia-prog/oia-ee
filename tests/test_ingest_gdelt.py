# tests/test_ingest_gdelt.py
import pytest
import respx
import httpx
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Noticia
from pipeline.ingest_gdelt import run_gdelt_pipeline, IngestResult
from pipeline.utils.claude_client import NoticiasClassification

FAKE_VECTOR = [0.1] * 1024

GDELT_RESPONSE = {
    "articles": [
        {
            "title": "IA y empleo en México",
            "url": "https://t.co/gdelt1",
            "seendate": "20240415T120000Z",
            "sourcecountry": "Mexico",
        },
        {
            "title": "AI education worldwide",
            "url": "https://t.co/gdelt2",
            "seendate": "20240415T130000Z",
            "sourcecountry": "United States",
        },
    ]
}

FAKE_CLASSIFICATION = NoticiasClassification(
    sector="tecnologia",
    tipo_impacto="despido_masivo",
    n_empleados_afectados=100,
    empresa="Tech Corp",
    causa_ia="LLM automation",
    resumen="Resumen de prueba para test automatizado.",
)


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


@respx.mock
def test_pipeline_completo(session):
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json=GDELT_RESPONSE)
    )
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"embedding": FAKE_VECTOR}]})
    )
    with patch("pipeline.ingest_gdelt.ClaudeClient") as MockClaude:
        MockClaude.return_value.clasificar_noticia.return_value = FAKE_CLASSIFICATION
        result = run_gdelt_pipeline(
            session,
            api_key_claude="test-claude",
            api_key_voyage="test-voyage",
            queries=["inteligencia artificial empleo"],
        )
    assert result.fetched == 2
    assert result.stored == 2
    assert result.classified == 2
    assert result.embedded == 2


@respx.mock
def test_pipeline_salta_duplicados(session):
    existing = Noticia(titulo="Ya existe", url="https://t.co/gdelt1", fuente="rss")
    session.add(existing)
    session.flush()

    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json=GDELT_RESPONSE)
    )
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"embedding": FAKE_VECTOR}]})
    )
    with patch("pipeline.ingest_gdelt.ClaudeClient") as MockClaude:
        MockClaude.return_value.clasificar_noticia.return_value = FAKE_CLASSIFICATION
        result = run_gdelt_pipeline(
            session,
            api_key_claude="test-claude",
            api_key_voyage="test-voyage",
            queries=["inteligencia artificial empleo"],
        )
    assert result.fetched == 2
    assert result.stored == 1


@respx.mock
def test_pipeline_classify_falla_continua(session):
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json={
            "articles": [{"title": "IA test", "url": "https://t.co/fail1", "seendate": "20240415T120000Z"}]
        })
    )
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"embedding": FAKE_VECTOR}]})
    )
    with patch("pipeline.ingest_gdelt.ClaudeClient") as MockClaude:
        MockClaude.return_value.clasificar_noticia.return_value = None
        result = run_gdelt_pipeline(
            session,
            api_key_claude="test-claude",
            api_key_voyage="test-voyage",
            queries=["test"],
        )
    assert result.stored == 1
    assert result.classified == 0
    assert result.embedded == 1


@respx.mock
def test_pipeline_embed_falla_continua(session):
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json={
            "articles": [{"title": "IA embed test", "url": "https://t.co/efail1", "seendate": "20240415T120000Z"}]
        })
    )
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(500)
    )
    with patch("pipeline.ingest_gdelt.ClaudeClient") as MockClaude:
        MockClaude.return_value.clasificar_noticia.return_value = FAKE_CLASSIFICATION
        result = run_gdelt_pipeline(
            session,
            api_key_claude="test-claude",
            api_key_voyage="test-voyage",
            queries=["test"],
        )
    assert result.stored == 1
    assert result.classified == 1
    assert result.embedded == 0
