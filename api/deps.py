# api/deps.py
from pipeline.db import get_session


def get_db():
    """FastAPI dependency: yields a DB session."""
    with get_session() as session:
        yield session
