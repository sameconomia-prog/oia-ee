"""Tools de fuentes internacionales: WEF, McKinsey, CEPAL, Frey-Osborne, Anthropic.

Endpoints:
- /publico/benchmarks/sources
- /publico/benchmarks/sources/{source_id}
"""
from __future__ import annotations
from functools import lru_cache

from pipeline.agents.tools._http import get_json


_VALID_SOURCES = {"wef", "mckinsey", "cepal", "frey-osborne", "anthropic", "eloundou-anthropic"}


@lru_cache(maxsize=1)
def list_sources() -> list[dict]:
    """Lista de fuentes con id, nombre, año, alcance."""
    data = get_json("/publico/benchmarks/sources")
    return data if isinstance(data, list) else []


def source_lookup(source_id: str) -> dict | None:
    """Detalle + hallazgos clave de una fuente."""
    if not source_id:
        return None
    sid = source_id.lower().strip()
    if sid == "anthropic":
        sid = "eloundou-anthropic"
    if sid not in _VALID_SOURCES:
        return None
    return get_json(f"/publico/benchmarks/sources/{sid}")


__all__ = ["source_lookup", "list_sources"]
