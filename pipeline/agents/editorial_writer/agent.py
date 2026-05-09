"""Agente A — Editorial Writer.

Genera un MDX nuevo a partir de un brief, usando RAG sobre los 88 MDX existentes
para mantener voz y evitar duplicación.

Backends:
- "router" (default, gratis): cascada free-ai-stack — ojo, calidad puede caer
  en artículos largos. Útil para draft inicial.
- "anthropic": Sonnet 4.6 con prompt caching. Mejor calidad para producción.
  Requiere ANTHROPIC_API_KEY.

Uso:
    from pipeline.agents.editorial_writer.agent import write_mdx

    mdx = write_mdx(
        brief="Análisis del impacto de IA en carreras de salud en México 2026",
        tipo="analisis",
        fecha="2026-05-09",
    )
    print(mdx)
"""
from __future__ import annotations
import re
from datetime import date
from pathlib import Path
from typing import Literal

import yaml

from pipeline.agents.common.anthropic_client import AgentClient, cached_block
from pipeline.agents.common.router_client import RouterClient
from pipeline.agents.rag.retriever import search

# Para artículos largos académicos, Groq llama-3.1-8b genera filler.
# Reordenamos providers priorizando los que escriben narrativa rica:
# DeepSeek (excelente prosa larga) > Qwen plus > Cerebras 70B > Mistral > Groq último.
_EDITORIAL_PROVIDER_ORDER = ["DeepSeek", "Qwen", "Cerebras", "Mistral", "OpenRouter", "Cohere", "ZAI", "Groq"]


def _editorial_router() -> RouterClient:
    from pipeline.ai_router.providers import active_providers
    all_p = active_providers()
    by_name = {p["name"]: p for p in all_p}
    ordered = [by_name[n] for n in _EDITORIAL_PROVIDER_ORDER if n in by_name]
    return RouterClient(providers=ordered)

AGENT = "editorial_writer"
ANTHROPIC_MODEL = "claude-sonnet-4-6"
Backend = Literal["router", "anthropic"]

_HERE = Path(__file__).resolve().parent
_PROMPT_PATH = _HERE / "prompts" / "system.md"

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)
_FENCE_RE = re.compile(r"^```(?:mdx|markdown|md)?\s*\n", re.MULTILINE)


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


_TRAILING_NOTE_RE = re.compile(
    r"\n+(?:---+\s*\n+)?(?:nota|note|n\.b\.|aclaraci[oó]n|disclaimer)[\s:].*",
    re.IGNORECASE | re.DOTALL,
)


def _strip_fences(text: str) -> str:
    """Si el modelo envolvió el output en fences, los quita.
    También elimina notas finales de meta-confirmación tipo 'Nota: el artículo tiene X palabras'.
    """
    text = _FENCE_RE.sub("", text)
    if text.rstrip().endswith("```"):
        text = text.rstrip()[:-3].rstrip() + "\n"
    text = _TRAILING_NOTE_RE.sub("\n", text)
    return text.rstrip() + "\n"


def _validate_frontmatter(mdx: str) -> dict:
    """Verifica que el MDX tenga frontmatter YAML válido. Retorna el dict parseado."""
    m = _FRONTMATTER_RE.match(mdx)
    if not m:
        raise ValueError("MDX sin frontmatter válido (debe empezar con --- y cerrar con ---)")
    fm_raw = m.group(1)
    try:
        fm = yaml.safe_load(fm_raw) or {}
    except yaml.YAMLError as e:
        raise ValueError(f"Frontmatter YAML inválido: {e}") from e

    required = {"titulo", "tipo", "fecha", "resumen", "tags", "acceso"}
    missing = required - set(fm.keys())
    if missing:
        raise ValueError(f"Frontmatter incompleto, falta: {sorted(missing)}")

    if fm.get("tipo") not in ("analisis", "nota", "investigacion", "carta"):
        raise ValueError(f"tipo inválido: {fm.get('tipo')!r}")
    if fm.get("acceso") not in ("abierto", "premium"):
        raise ValueError(f"acceso inválido: {fm.get('acceso')!r}")
    if not isinstance(fm.get("tags"), list) or len(fm["tags"]) < 3:
        raise ValueError(f"tags debe ser lista de ≥3 elementos, recibido: {fm.get('tags')!r}")

    return fm


def _format_corpus_hits(hits: list[dict]) -> str:
    """Renderiza hits del RAG para incluir en el prompt."""
    parts = ["## Corpus existente — ejemplos de voz y temas previos\n"]
    for i, h in enumerate(hits, 1):
        parts.append(
            f"### Hit {i} — slug `{h['slug']}` · sección `{h['section_title']}` "
            f"(score {h['score']:.3f})\n\n{h['content']}\n"
        )
    parts.append("\n*Úsalos para mantener voz y evitar duplicar ángulos. NO copies texto literal.*")
    return "\n\n".join(parts)


def write_mdx(
    brief: str,
    *,
    tipo: str = "analisis",
    fecha: str | None = None,
    audiencia: str = "directores académicos",
    carrera_benchmark: str | None = None,
    tags_sugeridos: list[str] | None = None,
    palabras_objetivo: int = 1100,
    backend: Backend = "router",
    rag_k: int = 5,
    extra_context: str | None = None,
    client=None,
) -> tuple[str, dict]:
    """Genera un MDX nuevo. Retorna (mdx_text, frontmatter_dict)."""
    if fecha is None:
        fecha = date.today().isoformat()

    # 1. RAG: buscar chunks relevantes
    hits = search(brief, k=rag_k)
    corpus_block = _format_corpus_hits(hits)

    # 2. System prompt + corpus (cached si Anthropic)
    system_prompt = _load_prompt()

    if backend == "anthropic":
        system_payload = [cached_block(system_prompt)]
        cli = client or AgentClient()
        model_to_use = ANTHROPIC_MODEL
    elif backend == "router":
        system_payload = [{"type": "text", "text": system_prompt}]
        cli = client or _editorial_router()
        model_to_use = None
    else:
        raise ValueError(f"backend desconocido: {backend!r}")

    # 3. User message con brief estructurado
    user_lines = [
        "## Brief",
        f"- **Tema/ángulo:** {brief}",
        f"- **Tipo:** {tipo}",
        f"- **Fecha:** {fecha}",
        f"- **Audiencia primaria:** {audiencia}",
        f"- **Palabras objetivo:** {palabras_objetivo}",
    ]
    if carrera_benchmark:
        user_lines.append(f"- **Carrera benchmark:** `{carrera_benchmark}` (incluye en frontmatter)")
    if tags_sugeridos:
        user_lines.append(f"- **Tags sugeridos:** {', '.join(tags_sugeridos)}")
    if extra_context:
        user_lines += ["", "## Contexto adicional", extra_context]

    user_lines += ["", corpus_block, "", "---", "Genera el MDX completo. Empieza con `---` del frontmatter, sin texto antes."]

    kwargs = dict(
        agent=AGENT,
        system=system_payload,
        messages=[{"role": "user", "content": "\n".join(user_lines)}],
        max_tokens=4500,
        temperature=0.65,
        input_for_hash={"brief": brief, "tipo": tipo, "fecha": fecha, "backend": backend},
        extra={"brief": brief[:120], "tipo": tipo, "backend": backend, "rag_hits": [h["slug"] for h in hits]},
    )
    if model_to_use:
        kwargs["model"] = model_to_use

    resp = cli.create(**kwargs)
    mdx = _strip_fences(resp.text).strip()
    if not mdx.startswith("---"):
        # Algunos modelos prefijan "Aquí está…" — recortar al primer ---
        idx = mdx.find("\n---")
        if idx > 0:
            mdx = mdx[idx + 1:].lstrip()
        else:
            raise ValueError(f"Output sin frontmatter detectable. Texto:\n{mdx[:600]}")

    fm = _validate_frontmatter(mdx)
    return mdx, fm


__all__ = ["write_mdx", "AGENT", "ANTHROPIC_MODEL", "Backend"]
