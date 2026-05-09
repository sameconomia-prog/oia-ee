"""Cliente de embeddings con cascada de proveedores gratis.

Orden:
1. Mistral (mistral-embed, 1024 dims) — primer intento, free tier amplio.
2. Cohere (multilingual-light-v3.0, 384 dims) — fallback si Mistral falla.

Carga *_API_KEY desde os.environ + ~/Documents/free-ai-stack/.env auto-load.

Uso:
    from pipeline.agents.rag.embed_client import EmbedClient
    cli = EmbedClient()
    vecs = cli.embed(["hola mundo"], input_type="search_document")
"""
from __future__ import annotations
import os
import time
from pathlib import Path

import httpx

# Auto-cargar .env de free-ai-stack
_FREE_AI_ENV = Path.home() / "Documents" / "free-ai-stack" / ".env"
if _FREE_AI_ENV.is_file():
    for line in _FREE_AI_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and v and not os.environ.get(k):
            os.environ[k] = v


class _MistralProvider:
    name = "Mistral"
    endpoint = "https://api.mistral.ai/v1/embeddings"
    model = "mistral-embed"
    dims = 1024
    batch = 32

    def __init__(self):
        self.api_key = os.environ.get("MISTRAL_API_KEY", "")

    def available(self) -> bool:
        return bool(self.api_key)

    def embed(self, texts: list[str], input_type: str) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), self.batch):
            chunk = texts[i:i + self.batch]
            payload = {"model": self.model, "input": chunk}
            r = httpx.post(
                self.endpoint,
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=60.0,
            )
            if r.status_code == 429:
                time.sleep(2)
                r = httpx.post(self.endpoint, headers={"Authorization": f"Bearer {self.api_key}"}, json=payload, timeout=60.0)
            r.raise_for_status()
            data = r.json()
            for item in data.get("data", []):
                out.append(item["embedding"])
        return out


class _CohereProvider:
    name = "Cohere"
    endpoint = "https://api.cohere.com/v1/embed"
    model = "embed-multilingual-light-v3.0"
    dims = 384
    batch = 96

    def __init__(self):
        self.api_key = os.environ.get("COHERE_API_KEY", "")

    def available(self) -> bool:
        return bool(self.api_key)

    def embed(self, texts: list[str], input_type: str) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), self.batch):
            chunk = texts[i:i + self.batch]
            payload = {
                "model": self.model,
                "texts": chunk,
                "input_type": input_type,
                "embedding_types": ["float"],
                "truncate": "END",
            }
            r = httpx.post(
                self.endpoint,
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=60.0,
            )
            r.raise_for_status()
            data = r.json()
            raw = data.get("embeddings", [])
            vecs = raw.get("float", []) if isinstance(raw, dict) else raw
            out.extend(vecs)
        return out


class EmbedClient:
    """Cascada de proveedores. Prueba en orden hasta encontrar uno que funcione."""

    def __init__(self, providers: list | None = None):
        self.providers = providers or [_MistralProvider(), _CohereProvider()]
        self._chosen = None

    @property
    def chosen(self):
        return self._chosen

    def embed(self, texts: list[str], input_type: str = "search_document") -> list[list[float]]:
        if not texts:
            return []
        # Si ya elegimos un provider en una invocación previa, intentar primero ese
        ordered = self.providers if self._chosen is None else (
            [p for p in self.providers if p.name == self._chosen.name]
            + [p for p in self.providers if p.name != self._chosen.name]
        )
        last_err: Exception | None = None
        for p in ordered:
            if not p.available():
                continue
            try:
                vecs = p.embed(texts, input_type=input_type)
                if vecs:
                    self._chosen = p
                    return vecs
            except Exception as e:
                last_err = e
                continue
        raise RuntimeError(f"Ningún provider de embeddings funcionó. Último error: {last_err}")


__all__ = ["EmbedClient", "_MistralProvider", "_CohereProvider"]
