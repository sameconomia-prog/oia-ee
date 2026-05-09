"""CLI del Agente A — Editorial Writer.

Uso:
    python -m pipeline.agents.editorial_writer.cli \\
        --brief "Análisis del impacto de IA en carreras de salud en México" \\
        --tipo analisis \\
        --audiencia "directores académicos"

    # Con backend Anthropic (mejor calidad, requiere ANTHROPIC_API_KEY):
    python -m pipeline.agents.editorial_writer.cli --brief "..." --backend anthropic

    # Solo dry-run del prompt (sin API):
    python -m pipeline.agents.editorial_writer.cli --brief "..." --dry-run
"""
from __future__ import annotations
import argparse
import sys
from datetime import date
from pathlib import Path

from pipeline.agents.editorial_writer.agent import write_mdx
from pipeline.agents.rag.retriever import search

OUTPUTS_DIR = Path(__file__).resolve().parent / "outputs"


def _save(mdx: str, fm: dict) -> Path:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    fecha = fm.get("fecha", date.today().isoformat())
    titulo_slug = (fm.get("titulo") or "draft").lower()
    # slug ASCII-safe corto
    import re, unicodedata
    norm = unicodedata.normalize("NFKD", titulo_slug).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", norm).strip("-")[:60]
    fname = f"{fecha}-DRAFT-{slug}.mdx"
    path = OUTPUTS_DIR / fname
    path.write_text(mdx, encoding="utf-8")
    return path


def main() -> int:
    ap = argparse.ArgumentParser(prog="editorial-writer")
    ap.add_argument("--brief", help="Tema/ángulo del artículo")
    ap.add_argument("--tipo", choices=["analisis", "nota", "investigacion", "carta"], default="analisis")
    ap.add_argument("--fecha", default=None, help="YYYY-MM-DD; default = hoy")
    ap.add_argument("--audiencia", default="directores académicos")
    ap.add_argument("--carrera", default=None, help="Slug de carrera benchmark si aplica")
    ap.add_argument("--tags", nargs="*", default=None)
    ap.add_argument("--palabras", type=int, default=1100)
    ap.add_argument("--backend", choices=["router", "anthropic"], default="router")
    ap.add_argument("--rag-k", type=int, default=5)
    ap.add_argument("--extra", default=None, help="Contexto adicional al modelo")
    ap.add_argument("--no-save", action="store_true")
    ap.add_argument("--dry-run", action="store_true",
                    help="Solo muestra los hits del RAG y tokens estimados, no llama API.")
    args = ap.parse_args()

    if not args.brief:
        ap.error("--brief es obligatorio")

    if args.dry_run:
        hits = search(args.brief, k=args.rag_k)
        print(f"DRY-RUN brief={args.brief!r}", file=sys.stderr)
        print(f"  RAG hits ({len(hits)}):", file=sys.stderr)
        for h in hits:
            print(f"   · score={h['score']:.3f} {h['slug']} :: {h['section_title']}", file=sys.stderr)
        return 0

    try:
        mdx, fm = write_mdx(
            brief=args.brief,
            tipo=args.tipo,
            fecha=args.fecha,
            audiencia=args.audiencia,
            carrera_benchmark=args.carrera,
            tags_sugeridos=args.tags,
            palabras_objetivo=args.palabras,
            backend=args.backend,
            rag_k=args.rag_k,
            extra_context=args.extra,
        )
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2

    print(mdx)
    print("\n" + "─" * 64, file=sys.stderr)
    print(f"Frontmatter: tipo={fm['tipo']} tags={len(fm['tags'])} acceso={fm['acceso']}", file=sys.stderr)
    print(f"Cuerpo: ~{len(mdx)} chars (~{len(mdx) // 6} palabras estimadas)", file=sys.stderr)

    if not args.no_save:
        path = _save(mdx, fm)
        print(f"Guardado: {path}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
