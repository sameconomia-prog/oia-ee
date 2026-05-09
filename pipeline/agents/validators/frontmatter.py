"""Validador de frontmatter MDX (extraído del agent.py para reusar)."""
from __future__ import annotations
import re

import yaml

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)

_REQUIRED = {"titulo", "tipo", "fecha", "resumen", "tags", "acceso"}
_VALID_TIPOS = {"analisis", "nota", "investigacion", "carta"}
_VALID_ACCESO = {"abierto", "premium"}


def validate_frontmatter(mdx: str) -> dict:
    """Retorna dict frontmatter parseado. Lanza ValueError si inválido."""
    m = _FRONTMATTER_RE.match(mdx)
    if not m:
        raise ValueError("MDX sin frontmatter (debe empezar con --- y cerrar con ---)")
    fm_raw = m.group(1)
    try:
        fm = yaml.safe_load(fm_raw) or {}
    except yaml.YAMLError as e:
        raise ValueError(f"Frontmatter YAML inválido: {e}") from e

    missing = _REQUIRED - set(fm.keys())
    if missing:
        raise ValueError(f"Frontmatter incompleto, falta: {sorted(missing)}")
    if fm.get("tipo") not in _VALID_TIPOS:
        raise ValueError(f"tipo inválido: {fm.get('tipo')!r} (válidos: {sorted(_VALID_TIPOS)})")
    if fm.get("acceso") not in _VALID_ACCESO:
        raise ValueError(f"acceso inválido: {fm.get('acceso')!r}")
    tags = fm.get("tags")
    if not isinstance(tags, list) or len(tags) < 3:
        raise ValueError(f"tags debe ser lista de ≥3 elementos: recibido {tags!r}")
    return fm


def split_frontmatter(mdx: str) -> tuple[str, str]:
    """Retorna (frontmatter_raw, body). Lanza ValueError si no hay frontmatter."""
    m = _FRONTMATTER_RE.match(mdx)
    if not m:
        raise ValueError("MDX sin frontmatter")
    return m.group(1), m.group(2)


__all__ = ["validate_frontmatter", "split_frontmatter"]
