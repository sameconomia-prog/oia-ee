"""Helper HTTP compartido entre tools."""
from __future__ import annotations
import os
from functools import lru_cache

import httpx


@lru_cache(maxsize=1)
def base_url() -> str:
    return os.environ.get("OIA_API_URL", "https://oia-api-production.up.railway.app").rstrip("/")


def get_json(path: str, *, timeout: float = 12.0) -> dict | list | None:
    """GET path absoluto/relativo desde base_url. Retorna None si 404, raise si otro error."""
    url = path if path.startswith("http") else f"{base_url()}{path}"
    try:
        r = httpx.get(url, headers={"User-Agent": "oia-agent-tools/1.0"}, timeout=timeout)
    except httpx.HTTPError as e:
        raise RuntimeError(f"HTTP error a {url}: {e}") from e
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()
