# tests/utils/test_embeddings.py
import json
import pytest
import respx
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Noticia
from pipeline.utils.embeddings import embed_text, store_embedding, search_similar

FAKE_VECTOR = [0.1] * 1024


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
def test_embed_text_retorna_vector():
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"embedding": FAKE_VECTOR}]})
    )
    result = embed_text("despidos por IA en Meta", api_key="test-key")
    assert isinstance(result, list)
    assert len(result) == 1024


@respx.mock
def test_embed_text_retorna_none_en_error():
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(500)
    )
    result = embed_text("texto", api_key="test-key")
    assert result is None


def test_store_embedding(session):
    n = Noticia(titulo="Test embed", url="https://t.co/emb1", fuente="rss")
    session.add(n)
    session.flush()
    ok = store_embedding(n.id, FAKE_VECTOR, session)
    assert ok is True
    assert json.loads(n.embedding_json) == FAKE_VECTOR


def test_search_similar_retorna_mas_cercano(session):
    n1 = Noticia(titulo="IA empleo", url="https://t.co/s1", fuente="rss",
                 embedding_json=json.dumps([1.0, 0.0] * 512))
    n2 = Noticia(titulo="Carrera universitaria", url="https://t.co/s2", fuente="rss",
                 embedding_json=json.dumps([0.0, 1.0] * 512))
    session.add_all([n1, n2])
    session.flush()
    results = search_similar([1.0, 0.0] * 512, session, top_k=1)
    assert len(results) == 1
    assert results[0].titulo == "IA empleo"
