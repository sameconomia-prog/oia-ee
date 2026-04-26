# tests/test_pgvector_model.py
def test_noticia_has_embedding_column():
    """Noticia debe tener campo embedding."""
    from pipeline.db.models import Noticia
    from sqlalchemy.inspection import inspect
    mapper = inspect(Noticia)
    col_names = [c.key for c in mapper.columns]
    assert "embedding" in col_names


def test_noticia_embedding_accepts_list(session):
    """El campo embedding acepta una lista de floats (se almacena como lista)."""
    from pipeline.db.models import Noticia
    n = Noticia(
        titulo="Test noticia pgvector",
        url="https://test.example.com/pgvector-test",
        embedding=[0.1] * 1536,
    )
    session.add(n)
    session.flush()
    assert n.id is not None
