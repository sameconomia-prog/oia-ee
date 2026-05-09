"""Local vector store: numpy npz + json metadata.

Decisión de diseño: archivo local en lugar de pgvector para MVP del Sprint 2.
Razón: 89 MDX × 5 chunks ≈ 450 vectores × 384 dims = ~700 KB. Cosine similarity
en numpy es <50ms. Cuando crezca o se quiera multi-instancia, migrar a pgvector
con migración Alembic.

Archivos:
- pipeline/agents/rag/data/index.npz : matrix (N, 384) float32
- pipeline/agents/rag/data/index.json : list[dict] con {slug, chunk_idx, section_title, content, char_len}
"""
from __future__ import annotations
import json
from dataclasses import asdict
from pathlib import Path

import numpy as np

from pipeline.agents.rag.chunker import Chunk

DATA_DIR = Path(__file__).resolve().parent / "data"
EMBED_PATH = DATA_DIR / "index.npz"
META_PATH = DATA_DIR / "index.json"


def save_index(chunks: list[Chunk], embeddings: list[list[float]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    arr = np.asarray(embeddings, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    arr = arr / np.where(norms == 0, 1, norms)  # normalize for cosine
    np.savez_compressed(EMBED_PATH, embeddings=arr)
    META_PATH.write_text(
        json.dumps([asdict(c) for c in chunks], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_index() -> tuple[np.ndarray, list[dict]]:
    if not EMBED_PATH.exists() or not META_PATH.exists():
        raise FileNotFoundError(
            f"Índice no encontrado en {DATA_DIR}. Corre: "
            f"python -m pipeline.agents.rag.cli index"
        )
    arr = np.load(EMBED_PATH)["embeddings"]
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    return arr, meta


def index_stats() -> dict:
    if not EMBED_PATH.exists():
        return {"exists": False}
    arr, meta = load_index()
    slugs = {m["slug"] for m in meta}
    return {
        "exists": True,
        "vectors": int(arr.shape[0]),
        "dims": int(arr.shape[1]),
        "unique_slugs": len(slugs),
        "size_kb": EMBED_PATH.stat().st_size // 1024,
    }


__all__ = ["save_index", "load_index", "index_stats", "DATA_DIR", "EMBED_PATH", "META_PATH"]
