"""Indexer: lee MDX → chunks → embeddings Cohere → save local store.

Uso:
    from pipeline.agents.rag.indexer import build_index
    stats = build_index()
    print(stats)
"""
from __future__ import annotations
from pathlib import Path

from pipeline.agents.rag.chunker import chunk_mdx
from pipeline.agents.rag.embed_client import EmbedClient
from pipeline.agents.rag.store import save_index, index_stats

MDX_DIR = Path(__file__).resolve().parents[3] / "frontend" / "src" / "content" / "investigaciones"


def build_index(*, mdx_dir: Path | None = None, verbose: bool = True) -> dict:
    mdx_dir = mdx_dir or MDX_DIR
    mdx_paths = sorted(mdx_dir.glob("*.mdx"))
    if verbose:
        print(f"📚 Indexando {len(mdx_paths)} MDX desde {mdx_dir}")

    all_chunks = []
    for p in mdx_paths:
        cs = chunk_mdx(p)
        all_chunks.extend(cs)
    if verbose:
        print(f"   → {len(all_chunks)} chunks generados (avg {len(all_chunks) / max(1, len(mdx_paths)):.1f}/MDX)")

    if not all_chunks:
        raise RuntimeError("Sin chunks para indexar.")

    if verbose:
        print("🔢 Embedding con cascada (Mistral → Cohere)…")
    client = EmbedClient()
    texts = [c.content for c in all_chunks]
    vecs = client.embed(texts, input_type="search_document")
    if verbose:
        print(f"   → {len(vecs)} vectores ({len(vecs[0])} dims) via {client.chosen.name}")

    save_index(all_chunks, vecs)
    stats = index_stats()
    if verbose:
        print(f"✅ Índice guardado: {stats}")
    return stats


__all__ = ["build_index", "MDX_DIR"]
