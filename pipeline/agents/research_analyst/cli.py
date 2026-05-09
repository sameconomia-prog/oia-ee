"""CLI del Agente B — Quantitative Research Analyst.

Subcomandos / flags:

    # Analizar un PDF local o URL
    python -m pipeline.agents.research_analyst.cli \\
        --source path/to/paper.pdf \\
        --focus "impacto en contaduría" \\
        --backend router

    # Analizar URL pública
    python -m pipeline.agents.research_analyst.cli \\
        --source https://www.weforum.org/.../wef_future_of_jobs_2025.pdf

    # Encadenar con Agente A: B genera brief → A escribe MDX
    python -m pipeline.agents.research_analyst.cli \\
        --source paper.pdf --focus "..." --to-writer

    # Inspeccionar documento sin llamar API (extraer texto + estadísticas)
    python -m pipeline.agents.research_analyst.cli --source paper.pdf --inspect
"""
from __future__ import annotations
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from pipeline.agents.research_analyst.agent import analyze
from pipeline.agents.research_analyst.handoff import brief_to_writer_args
from pipeline.agents.research_analyst.pdf_loader import load_document

OUTPUTS_DIR = Path(__file__).resolve().parent / "outputs"


def _save_output(research, source: str, fmt: str = "json") -> Path:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    sha = (research.source_id or source).replace("/", "_").replace(":", "_")[-40:]
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    path = OUTPUTS_DIR / f"{ts}-{sha}.{fmt}"
    if fmt == "json":
        path.write_text(research.model_dump_json(indent=2), encoding="utf-8")
    return path


def _print_summary(research) -> None:
    print(f"\n{'─' * 64}", file=sys.stderr)
    print(f"source_id : {research.source_id}", file=sys.stderr)
    print(f"summary   : {research.summary_es[:240]}…", file=sys.stderr)
    print(f"findings  : {len(research.findings)}", file=sys.stderr)
    if research.findings:
        by_conf = {"alta": 0, "media": 0, "baja": 0}
        for f in research.findings:
            by_conf[f.confidence.value] = by_conf.get(f.confidence.value, 0) + 1
        print(f"            confianza alta={by_conf['alta']} media={by_conf['media']} baja={by_conf['baja']}", file=sys.stderr)
    print(f"skills    : {len(research.skills_emergentes)} (emergentes/declining detectados)", file=sys.stderr)
    print(f"carreras  : {len(research.carreras_impactadas)} impactadas", file=sys.stderr)
    print(f"yaml_patch: {len(research.yaml_patch_suggestion)} sugerencias", file=sys.stderr)
    print(f"brief     : {'sí' if research.brief_for_writer else 'no (no amerita MDX nuevo)'}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser(prog="research-analyst")
    ap.add_argument("--source", required=False,
                    help="Path local o URL a PDF / .txt / .md")
    ap.add_argument("--focus", default=None,
                    help="Foco analítico opcional (ej. 'impacto en contaduría')")
    ap.add_argument("--backend", choices=["router", "anthropic"], default="router")
    ap.add_argument("--max-chars", type=int, default=None,
                    help="Override max chars por chunk (default 60000)")
    ap.add_argument("--inspect", action="store_true",
                    help="Solo carga el documento e imprime estadísticas, no llama API")
    ap.add_argument("--to-writer", action="store_true",
                    help="Si hay brief_for_writer, encadena con Agente A para producir MDX")
    ap.add_argument("--writer-backend", choices=["router", "anthropic"], default="router")
    ap.add_argument("--writer-audiencia", default="directores académicos")
    ap.add_argument("--no-save", action="store_true")
    args = ap.parse_args()

    if not args.source:
        ap.error("--source es obligatorio")

    if args.inspect:
        text, meta = load_document(args.source)
        print(f"source_id : {meta.source_id}", file=sys.stderr)
        print(f"sha       : {meta.sha}", file=sys.stderr)
        print(f"pages     : {meta.pages}", file=sys.stderr)
        print(f"chars     : {meta.chars}", file=sys.stderr)
        print(f"cache     : {meta.cache_path}", file=sys.stderr)
        print(f"tokens est: ~{meta.chars // 4}", file=sys.stderr)
        print(f"\nPrimeras 800 chars:", file=sys.stderr)
        print(text[:800], file=sys.stderr)
        return 0

    try:
        research = analyze(
            args.source, focus=args.focus,
            backend=args.backend, max_chars_per_call=args.max_chars,
        )
    except Exception as e:
        print(f"ERROR analyze: {e}", file=sys.stderr)
        return 2

    print(research.model_dump_json(indent=2))
    _print_summary(research)

    if not args.no_save:
        path = _save_output(research, args.source)
        print(f"Guardado: {path}", file=sys.stderr)

    if args.to_writer:
        if not research.brief_for_writer:
            print("\n[handoff] brief_for_writer=null — no se ejecuta Editorial Writer.", file=sys.stderr)
            return 0
        from pipeline.agents.editorial_writer.agent import write_mdx, quality_report
        try:
            kwargs = brief_to_writer_args(
                research, audiencia=args.writer_audiencia, backend=args.writer_backend,
            )
            mdx, fm = write_mdx(**kwargs)
        except Exception as e:
            print(f"ERROR Editorial Writer: {e}", file=sys.stderr)
            return 3
        print("\n" + "═" * 64, file=sys.stderr)
        print("MDX generado por Agente A desde brief de B:", file=sys.stderr)
        print("═" * 64, file=sys.stderr)
        print(mdx)
        try:
            report = quality_report(mdx)
            print(f"\nValidación: cifras {report['cifras']['cited']}/{report['cifras']['total']} cited · wikilinks {report['wikilinks']['valid']}/{report['wikilinks']['total']} válidos", file=sys.stderr)
            for w in report.get("warnings", []):
                print(f"  {w}", file=sys.stderr)
        except Exception:
            pass

    return 0


if __name__ == "__main__":
    sys.exit(main())
