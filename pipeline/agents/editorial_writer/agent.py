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
from pipeline.agents.tools import benchmark_lookup, kpi_lookup, list_benchmark_slugs, source_lookup
from pipeline.agents.validators import validate_frontmatter as _shared_validate_frontmatter

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
    """Wrapper sobre el validador compartido (mantiene compat con llamadores previos)."""
    return _shared_validate_frontmatter(mdx)


def _detect_benchmark_slug(brief: str, explicit: str | None) -> str | None:
    """Heurística: detecta slug de carrera benchmark mencionado en el brief."""
    if explicit:
        return explicit
    try:
        slugs = list_benchmark_slugs()
    except Exception:
        return None
    if not slugs:
        return None
    brief_lower = brief.lower()
    # Match exacto del slug
    for s in slugs:
        if s in brief_lower:
            return s
    # Match por nombre legible (slug → "ingenieria sistemas" / "ingeniería sistemas")
    for s in slugs:
        # contaduria → "contaduria" o "contaduría"; ingenieria-sistemas → "ingeniería de sistemas"
        words = s.replace("-", " ")
        if words in brief_lower:
            return s
    return None


def _prefetch_tool_data(slug: str | None) -> dict:
    """Devuelve datos verificados pre-fetched. Vacío si no hay slug."""
    out: dict = {}
    if slug:
        try:
            kpi = kpi_lookup(slug, metric="summary")
            if kpi:
                out["kpi_lookup"] = kpi
        except Exception as e:
            out["kpi_lookup_error"] = str(e)
        try:
            bench = benchmark_lookup(slug)
            if bench:
                # Solo campos clave para no inflar prompt
                out["benchmark_summary"] = {
                    k: v for k, v in bench.items()
                    if k in ("nombre", "slug", "urgencia_curricular", "skills_declining",
                             "skills_growing", "skills_mixed_stable", "fuentes",
                             "carrera", "carrera_nombre", "descripcion")
                }
        except Exception as e:
            out["benchmark_lookup_error"] = str(e)
    return out


def _format_tool_data(data: dict) -> str:
    """Renderiza el bloque de datos verificados para el prompt."""
    if not data:
        return ""
    import json
    parts = ["## Datos verificados del observatorio (USA SOLO ESTOS números, no inventes otros)\n"]
    for key, val in data.items():
        if key.endswith("_error"):
            parts.append(f"### {key}\n*Error al consultar — omite este recurso en el artículo*\n")
            continue
        parts.append(f"### {key}\n```json\n{json.dumps(val, ensure_ascii=False, indent=2)}\n```\n")
    parts.append("\n*Cita estos datos cuando los uses: `(OIA-EE Benchmarks, 2026)` o `según el observatorio`.*")
    return "\n".join(parts)


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

    # 1b. Pre-fetch tools si detectamos slug de carrera benchmark
    detected_slug = _detect_benchmark_slug(brief, carrera_benchmark)
    tool_data = _prefetch_tool_data(detected_slug)
    tool_block = _format_tool_data(tool_data)
    # Si el detectado no fue explícito, considerarlo para el frontmatter benchmark
    if detected_slug and not carrera_benchmark:
        carrera_benchmark = detected_slug

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

    if tool_block:
        user_lines += ["", tool_block]
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


def quality_report(mdx: str) -> dict:
    """Ejecuta los 3 validadores y retorna un reporte combinado.

    Usable post-generación o sobre cualquier MDX existente.
    """
    from pipeline.agents.validators import cifras_summary, wikilinks_summary, split_frontmatter

    fm = _shared_validate_frontmatter(mdx)
    _, body = split_frontmatter(mdx)
    cifras = cifras_summary(body)
    links = wikilinks_summary(body)
    return {
        "frontmatter_ok": True,
        "frontmatter": {k: fm[k] for k in ("titulo", "tipo", "tags", "acceso") if k in fm},
        "body_chars": len(body),
        "body_words_est": len(body.split()),
        "cifras": cifras,
        "wikilinks": links,
        "warnings": _build_warnings(cifras, links),
    }


def _build_warnings(cifras: dict, links: dict) -> list[str]:
    w: list[str] = []
    if cifras.get("uncited", 0) > 0:
        ratio = cifras.get("ratio_cited", 1)
        w.append(f"⚠️ {cifras['uncited']} cifra(s) sin cita verificable (ratio cited={ratio:.0%}).")
    if links.get("invalid", 0) > 0:
        bad = ", ".join(p["path"] for p in links["invalid_paths"][:3])
        w.append(f"⚠️ {links['invalid']} wikilink(s) rotos o inventados: {bad}")
    return w


__all__ = ["write_mdx", "quality_report", "AGENT", "ANTHROPIC_MODEL", "Backend"]
