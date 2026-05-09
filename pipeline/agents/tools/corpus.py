"""Wrapper del RAG retriever para consumo uniforme tipo tool."""
from __future__ import annotations

from pipeline.agents.rag.retriever import search


def corpus_search(query: str, k: int = 5) -> list[dict]:
    """Busca en el corpus indexado de los 88+ MDX. Retorna chunks con score."""
    if not query or not query.strip():
        return []
    return search(query, k=k)


__all__ = ["corpus_search"]
