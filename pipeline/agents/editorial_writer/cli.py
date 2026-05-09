"""CLI del Agente A — Editorial Writer.

Subcomandos:
- (sin subcomando, default): genera un MDX nuevo
- --report PATH: ejecuta quality_report sobre un MDX existente
- --promote PATH [--slug ALT]: mueve un draft de outputs/ → frontend/src/content/investigaciones/

Ejemplos:
    # Generar
    python -m pipeline.agents.editorial_writer.cli \\
        --brief "Análisis del impacto de IA en Contaduría México 2026" \\
        --tipo analisis

    # Reporte de calidad sobre MDX existente
    python -m pipeline.agents.editorial_writer.cli \\
        --report frontend/src/content/investigaciones/2026-04-contaduria-ia-2030.mdx

    # Promover draft a corpus oficial
    python -m pipeline.agents.editorial_writer.cli \\
        --promote pipeline/agents/editorial_writer/outputs/2026-05-09-DRAFT-foo.mdx
"""
from __future__ import annotations
import argparse
import re
import shutil
import sys
import unicodedata
from datetime import date
from pathlib import Path

from pipeline.agents.editorial_writer.agent import write_mdx, quality_report
from pipeline.agents.rag.retriever import search
from pipeline.agents.validators import split_frontmatter, validate_frontmatter

OUTPUTS_DIR = Path(__file__).resolve().parent / "outputs"
INVESTIGACIONES_DIR = Path(__file__).resolve().parents[3] / "frontend" / "src" / "content" / "investigaciones"


def _slugify(text: str, max_len: int = 60) -> str:
    norm = unicodedata.normalize("NFKD", text.lower()).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", norm).strip("-")
    return slug[:max_len].rstrip("-")


def _save_draft(mdx: str, fm: dict) -> Path:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    fecha = fm.get("fecha", date.today().isoformat())
    slug = _slugify(fm.get("titulo") or "draft")
    fname = f"{fecha}-DRAFT-{slug}.mdx"
    path = OUTPUTS_DIR / fname
    path.write_text(mdx, encoding="utf-8")
    return path


def _print_report(report: dict) -> None:
    print("\n" + "=" * 64, file=sys.stderr)
    print("Quality report", file=sys.stderr)
    print("=" * 64, file=sys.stderr)
    print(f"  Frontmatter: {report['frontmatter']}", file=sys.stderr)
    print(f"  Body: {report['body_chars']} chars · ~{report['body_words_est']} palabras", file=sys.stderr)
    cifras = report["cifras"]
    print(f"  Cifras: total={cifras['total']} cited={cifras['cited']} uncited={cifras['uncited']} ratio={cifras['ratio_cited']:.0%}", file=sys.stderr)
    if cifras["uncited_examples"]:
        print("    Cifras sin cita (top 3):", file=sys.stderr)
        for ex in cifras["uncited_examples"][:3]:
            print(f"      • {ex['cifra']!r}: {ex['context'][:120]}…", file=sys.stderr)
    links = report["wikilinks"]
    print(f"  Wikilinks: total={links['total']} valid={links['valid']} invalid={links['invalid']}", file=sys.stderr)
    if links["invalid_paths"]:
        for p in links["invalid_paths"][:5]:
            print(f"      • {p['path']} ({p['reason']})", file=sys.stderr)
    if report["warnings"]:
        print("\n  WARNINGS:", file=sys.stderr)
        for w in report["warnings"]:
            print(f"    {w}", file=sys.stderr)
    else:
        print("\n  ✅ Sin warnings críticos.", file=sys.stderr)


def _do_report(path: Path) -> int:
    if not path.is_file():
        print(f"ERROR: archivo no encontrado: {path}", file=sys.stderr)
        return 2
    mdx = path.read_text(encoding="utf-8")
    try:
        report = quality_report(mdx)
    except Exception as e:
        print(f"ERROR validando MDX: {e}", file=sys.stderr)
        return 3
    print(f"Reporte para: {path}", file=sys.stderr)
    _print_report(report)
    return 0


def _do_promote(path: Path, alt_slug: str | None = None) -> int:
    if not path.is_file():
        print(f"ERROR: archivo no encontrado: {path}", file=sys.stderr)
        return 2
    mdx = path.read_text(encoding="utf-8")
    try:
        fm = validate_frontmatter(mdx)
    except Exception as e:
        print(f"ERROR frontmatter inválido: {e}", file=sys.stderr)
        return 3
    fecha = fm.get("fecha") or date.today().isoformat()
    slug = alt_slug or _slugify(fm.get("titulo") or path.stem)
    final_name = f"{fecha[:7]}-{slug}.mdx" if not slug.startswith(fecha[:4]) else f"{slug}.mdx"
    INVESTIGACIONES_DIR.mkdir(parents=True, exist_ok=True)
    target = INVESTIGACIONES_DIR / final_name
    if target.exists():
        print(f"ERROR: el destino ya existe: {target}\nUsa --slug ALT para renombrar.", file=sys.stderr)
        return 4
    shutil.copy(path, target)
    print(f"✅ Promovido: {target}", file=sys.stderr)
    print("Recuerda: re-indexar el RAG con `python -m pipeline.agents.rag.cli index`", file=sys.stderr)
    print("Y commitear el nuevo MDX al repo.", file=sys.stderr)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(prog="editorial-writer")
    # Modos especiales (excluyentes con write)
    ap.add_argument("--report", metavar="PATH", default=None,
                    help="Ejecutar quality_report sobre un MDX existente, sin generar nada nuevo")
    ap.add_argument("--promote", metavar="PATH", default=None,
                    help="Mover un draft a frontend/src/content/investigaciones/")
    ap.add_argument("--slug", default=None,
                    help="Slug alternativo al promover (default: derivado del titulo)")
    # Generación
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
    ap.add_argument("--no-report", action="store_true",
                    help="No imprimir quality_report tras generar")
    ap.add_argument("--dry-run", action="store_true",
                    help="Solo muestra los hits del RAG, no llama API")
    args = ap.parse_args()

    if args.report:
        return _do_report(Path(args.report))
    if args.promote:
        return _do_promote(Path(args.promote), alt_slug=args.slug)

    if not args.brief:
        ap.error("--brief es obligatorio (o usa --report PATH / --promote PATH)")

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
        path = _save_draft(mdx, fm)
        print(f"Guardado: {path}", file=sys.stderr)

    if not args.no_report:
        try:
            report = quality_report(mdx)
            _print_report(report)
        except Exception as e:
            print(f"⚠️ No pude generar quality_report: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
