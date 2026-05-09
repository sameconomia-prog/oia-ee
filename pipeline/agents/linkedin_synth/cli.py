"""CLI del Agente C — LinkedIn Synthesizer.

Uso:
    python -m pipeline.agents.linkedin_synth.cli \\
        --slug 2026-05-carta-rectores-urgencia-curricular \\
        --pillar lectura_rectores \\
        --output json

    python -m pipeline.agents.linkedin_synth.cli \\
        --slug 2026-04-contaduria-ia-2030 \\
        --pillar diagnostico_semanal \\
        --output copypaste

    python -m pipeline.agents.linkedin_synth.cli --list-pillars
"""
from __future__ import annotations
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from pipeline.agents.linkedin_synth.agent import synthesize, AGENT
from pipeline.agents.common.schemas import LinkedInPillar

OUTPUTS_DIR = Path(__file__).resolve().parent / "outputs"


def _format_copypaste(post) -> str:
    """Formato listo para pegar a LinkedIn (texto + hashtags + nota CTA)."""
    parts = [post.cuerpo, "", post.cta, "", " ".join(post.hashtags)]
    return "\n".join(parts)


def _save_output(post, slug: str, pillar: str, fmt: str) -> Path:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    if fmt == "json":
        path = OUTPUTS_DIR / f"{slug}__{pillar}__{ts}.json"
        path.write_text(post.model_dump_json(indent=2), encoding="utf-8")
    else:
        path = OUTPUTS_DIR / f"{slug}__{pillar}__{ts}.txt"
        path.write_text(_format_copypaste(post), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(prog="linkedin-synth", description="Genera un post LinkedIn desde un MDX OIA-EE.")
    parser.add_argument("--slug", help="Slug del MDX (sin .mdx)")
    parser.add_argument(
        "--pillar",
        choices=[p.value for p in LinkedInPillar],
        help="Pillar editorial",
    )
    parser.add_argument("--output", choices=["json", "copypaste"], default="copypaste",
                        help="Formato de salida (default: copypaste)")
    parser.add_argument("--extra", default=None, help="Contexto adicional al modelo (opcional)")
    parser.add_argument("--no-save", action="store_true", help="Solo imprimir, no guardar archivo")
    parser.add_argument("--list-pillars", action="store_true", help="Lista los pillars disponibles y sale")
    parser.add_argument("--dry-run", action="store_true",
                        help="No llama API. Imprime el system+user que se enviaría y tokens estimados.")
    args = parser.parse_args()

    if args.list_pillars:
        print("Pillars disponibles:")
        for p in LinkedInPillar:
            print(f"  - {p.value}")
        return 0

    if not args.slug or not args.pillar:
        parser.error("--slug y --pillar son obligatorios (o usa --list-pillars)")

    if args.dry_run:
        from pipeline.agents.linkedin_synth.agent import _load_mdx, _load_prompt, _load_fewshots
        fm, body = _load_mdx(args.slug)
        sys_prompt = _load_prompt()
        fewshots = _load_fewshots(args.pillar)
        sys_chars = len(sys_prompt) + len(fewshots)
        user_chars = len(body[:8000]) + len(fm.get("_raw_frontmatter", "")) + 200
        print(f"DRY RUN — slug={args.slug} pillar={args.pillar}", file=sys.stderr)
        print(f"  System (cached) chars: {sys_chars} (~{sys_chars // 4} tokens)", file=sys.stderr)
        print(f"  User chars: {user_chars} (~{user_chars // 4} tokens)", file=sys.stderr)
        print(f"  MDX cargado: {fm['_slug']}", file=sys.stderr)
        print(f"  Frontmatter primeros 200 chars: {fm.get('_raw_frontmatter', '')[:200]}", file=sys.stderr)
        print(f"  Body primeros 200 chars: {body[:200]}", file=sys.stderr)
        return 0

    try:
        post = synthesize(slug=args.slug, pillar=args.pillar, extra_context=args.extra)
    except FileNotFoundError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2
    except ValueError as e:
        print(f"ERROR validación / parsing: {e}", file=sys.stderr)
        return 3

    if args.output == "json":
        rendered = post.model_dump_json(indent=2)
    else:
        rendered = _format_copypaste(post)

    print(rendered)
    print("\n" + "─" * 64, file=sys.stderr)

    if not args.no_save:
        saved = _save_output(post, args.slug, args.pillar, args.output)
        print(f"Guardado: {saved}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
