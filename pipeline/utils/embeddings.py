# pipeline/utils/embeddings.py
import json
import logging
import math
from typing import Optional
import httpx
from sqlalchemy.orm import Session
from pipeline.db.models import Noticia

logger = logging.getLogger(__name__)

VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"


def embed_text(text: str, api_key: str, model: str = "voyage-3-lite") -> Optional[list[float]]:
    """Llama a Voyage AI para obtener embedding. Retorna None en error."""
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                VOYAGE_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"input": [text[:8000]], "model": model},
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
    except Exception as e:
        logger.error("Embedding error: %s", e)
        return None


def store_embedding(noticia_id: str, vector: list[float], session: Session) -> bool:
    """Serializa el vector en Noticia.embedding_json. Retorna False si la noticia no existe."""
    noticia = session.query(Noticia).filter_by(id=noticia_id).first()
    if not noticia:
        return False
    noticia.embedding_json = json.dumps(vector)
    session.flush()
    return True


def search_similar(query_vector: list[float], session: Session, top_k: int = 5) -> list[Noticia]:
    """Busca noticias similares por cosine similarity sobre embedding_json (fallback Python)."""
    noticias = session.query(Noticia).filter(Noticia.embedding_json.isnot(None)).all()
    if not noticias:
        return []
    scored = []
    for n in noticias:
        try:
            vec = json.loads(n.embedding_json)
            scored.append((_cosine(query_vector, vec), n))
        except json.JSONDecodeError:
            pass
    scored.sort(key=lambda x: x[0], reverse=True)
    return [n for _, n in scored[:top_k]]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag = math.sqrt(sum(x ** 2 for x in a)) * math.sqrt(sum(x ** 2 for x in b))
    return dot / mag if mag else 0.0
