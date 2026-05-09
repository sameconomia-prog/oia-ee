"""Carga PDF (URL o path local) → texto plano. Cache local SHA-keyed.

Uso:
    from pipeline.agents.research_analyst.pdf_loader import load_document

    text, meta = load_document("https://example.com/paper.pdf")
    text, meta = load_document(Path("docs/wef_2025.pdf"))
    text, meta = load_document(Path("notes.txt"))      # también acepta .txt/.md
"""
from __future__ import annotations
import hashlib
from dataclasses import dataclass
from pathlib import Path

import httpx

CACHE_DIR = Path(__file__).resolve().parent / "cache"


@dataclass
class DocMeta:
    source_id: str         # URL o ruta del archivo
    sha: str               # sha-256 del contenido binario
    pages: int | None      # número de páginas (None si no es PDF)
    chars: int             # tamaño del texto extraído
    cache_path: Path       # ruta al texto cacheado


def _hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:16]


def _is_url(s: str) -> bool:
    return s.startswith(("http://", "https://"))


def _download(url: str, timeout: float = 60.0) -> bytes:
    r = httpx.get(url, headers={"User-Agent": "oia-research-analyst/1.0"},
                  timeout=timeout, follow_redirects=True)
    r.raise_for_status()
    return r.content


def _extract_text_pdf(data: bytes) -> tuple[str, int]:
    """Extrae texto de un PDF con pypdf. Retorna (texto, n_pages)."""
    from io import BytesIO
    from pypdf import PdfReader
    reader = PdfReader(BytesIO(data))
    parts = []
    for i, page in enumerate(reader.pages):
        try:
            t = page.extract_text() or ""
            if t.strip():
                parts.append(f"\n[Page {i+1}]\n{t}")
        except Exception:
            continue
    return "\n".join(parts), len(reader.pages)


def load_document(source: str | Path) -> tuple[str, DocMeta]:
    """Carga un documento (URL o path) y retorna (texto, meta).

    PDF se procesa con pypdf; .txt/.md se lee tal cual.
    Cache: el texto extraído se guarda en cache/<sha>.txt para evitar re-extracción.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    if isinstance(source, str) and _is_url(source):
        source_id = source
        data = _download(source)
        is_pdf = source.lower().endswith(".pdf") or data[:4] == b"%PDF"
    else:
        path = Path(source)
        if not path.is_file():
            raise FileNotFoundError(f"Archivo no existe: {path}")
        source_id = str(path.resolve())
        data = path.read_bytes()
        is_pdf = path.suffix.lower() == ".pdf" or data[:4] == b"%PDF"

    sha = _hash_bytes(data)
    cache_path = CACHE_DIR / f"{sha}.txt"

    if cache_path.is_file():
        text = cache_path.read_text(encoding="utf-8")
        # pages no se persiste en cache; lo dejamos None (no crítico)
        return text, DocMeta(source_id=source_id, sha=sha, pages=None,
                              chars=len(text), cache_path=cache_path)

    if is_pdf:
        text, pages = _extract_text_pdf(data)
    else:
        text = data.decode("utf-8", errors="replace")
        pages = None

    cache_path.write_text(text, encoding="utf-8")
    return text, DocMeta(source_id=source_id, sha=sha, pages=pages,
                          chars=len(text), cache_path=cache_path)


__all__ = ["load_document", "DocMeta"]
