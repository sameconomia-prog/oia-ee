"""Retriever: query → top-k chunks por cosine similarity.

Uso:
    from pipeline.agents.rag.retriever import search

    hits = search("contaduría D1 obsolescencia", k=5)
    for h in hits:
        print(h["score"], h["slug"], h["section_title"])
        print(h["content"][:200])
"""
from __future__ import annotations
import numpy as np

from pipeline.agents.rag.embed_client import EmbedClient
from pipeline.agents.rag.store import load_index


def search(query: str, k: int = 5, *, client: EmbedClient | None = None) -> list[dict]:
    """Retorna lista de {slug, chunk_idx, section_title, content, char_len, score}."""
    arr, meta = load_index()
    cli = client or EmbedClient()
    qv = cli.embed([query], input_type="search_query")[0]
    qv = np.asarray(qv, dtype=np.float32)
    qv = qv / max(np.linalg.norm(qv), 1e-9)

    scores = arr @ qv  # (N,)
    top_idx = np.argsort(-scores)[:k]
    out = []
    for i in top_idx:
        m = meta[int(i)].copy()
        m["score"] = float(scores[int(i)])
        out.append(m)
    return out


__all__ = ["search"]
