"""Chunker MDX para RAG.

Estrategia: split por headers `##` (nivel 2). Si una sección excede el límite,
sub-split por párrafos. Mantiene el frontmatter como chunk 0 (metadata-only,
no entra a embedding pero sí al index).

Tokens estimados ≈ chars/4.
"""
from __future__ import annotations
import re
from dataclasses import dataclass
from pathlib import Path

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)
_H2_SPLIT = re.compile(r"^##\s+", re.MULTILINE)
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")

MAX_CHARS = 3200  # ~800 tokens
MIN_CHARS = 200   # chunks <200 chars se mergean al siguiente


@dataclass
class Chunk:
    slug: str
    chunk_idx: int
    section_title: str
    content: str
    char_len: int


def parse_mdx(path: Path) -> tuple[str, str, str]:
    """Retorna (slug, frontmatter_raw, body)."""
    raw = path.read_text(encoding="utf-8")
    slug = path.stem
    m = _FRONTMATTER_RE.match(raw)
    if not m:
        return slug, "", raw
    return slug, m.group(1), m.group(2)


def chunk_mdx(path: Path) -> list[Chunk]:
    """Devuelve lista de Chunks listos para embedding."""
    slug, fm_raw, body = parse_mdx(path)
    out: list[Chunk] = []

    # Resumen del frontmatter (si existe) como chunk 0 — alta densidad informativa
    summary = ""
    if fm_raw:
        for line in fm_raw.splitlines():
            if line.strip().startswith("resumen:"):
                summary = line.split(":", 1)[1].strip().strip('"').strip("'")
                break

    if summary:
        out.append(Chunk(slug=slug, chunk_idx=0, section_title="resumen", content=summary, char_len=len(summary)))

    # Split body por H2
    parts = _H2_SPLIT.split(body)
    intro = parts[0].strip()  # texto antes del primer ##
    sections = parts[1:]      # cada uno empieza con el título de sección

    if intro and len(intro) >= MIN_CHARS:
        for sub in _split_long(intro, MAX_CHARS):
            out.append(Chunk(slug=slug, chunk_idx=len(out), section_title="intro", content=sub, char_len=len(sub)))

    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        title_end = sec.find("\n")
        title = sec[:title_end].strip() if title_end > 0 else sec[:80]
        sec_body = sec[title_end:].strip() if title_end > 0 else ""
        full = f"## {title}\n{sec_body}"
        if len(full) <= MAX_CHARS:
            if len(full) >= MIN_CHARS:
                out.append(Chunk(slug=slug, chunk_idx=len(out), section_title=title, content=full, char_len=len(full)))
        else:
            for sub in _split_long(full, MAX_CHARS):
                out.append(Chunk(slug=slug, chunk_idx=len(out), section_title=title, content=sub, char_len=len(sub)))

    return out


def _split_long(text: str, max_chars: int) -> list[str]:
    """Split por párrafos hasta que cada bloque ≤ max_chars."""
    paragraphs = _PARAGRAPH_SPLIT.split(text)
    chunks: list[str] = []
    cur = ""
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if len(cur) + len(p) + 2 > max_chars:
            if cur:
                chunks.append(cur)
            if len(p) > max_chars:
                # Párrafo individual gigante, hard split
                for i in range(0, len(p), max_chars):
                    chunks.append(p[i:i + max_chars])
                cur = ""
            else:
                cur = p
        else:
            cur = f"{cur}\n\n{p}" if cur else p
    if cur:
        chunks.append(cur)
    return chunks


__all__ = ["Chunk", "chunk_mdx", "parse_mdx", "MAX_CHARS", "MIN_CHARS"]
