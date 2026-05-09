"""Agente C — LinkedIn Synthesizer.

Convierte un MDX del observatorio en un post de LinkedIn validado contra schema.

Dos backends disponibles (seleccionables con `backend=`):
- `"router"` (default): cascada gratuita free-ai-stack (Groq, DeepSeek, Qwen, …).
- `"anthropic"`: Haiku 4.5 con prompt caching ephemeral. Mejor calidad consistente,
  pero requiere `ANTHROPIC_API_KEY` configurada.

Uso programático:

    from pipeline.agents.linkedin_synth.agent import synthesize

    post = synthesize(slug="2026-05-carta-rectores-urgencia-curricular",
                      pillar="lectura_rectores")  # usa router por default
    print(post.cuerpo)
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Literal

from pydantic import ValidationError

from pipeline.agents.common.anthropic_client import AgentClient, cached_block
from pipeline.agents.common.router_client import RouterClient
from pipeline.agents.common.schemas import LinkedInPillar, LinkedInPost

AGENT = "linkedin_synth"
ANTHROPIC_MODEL = "claude-haiku-4-5"
Backend = Literal["router", "anthropic"]

_HERE = Path(__file__).resolve().parent
_PROMPT_PATH = _HERE / "prompts" / "system.md"
_FEWSHOTS_PATH = _HERE / "few_shots.json"
_MDX_DIR = Path(__file__).resolve().parents[3] / "frontend" / "src" / "content" / "investigaciones"

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)
_JSON_BLOCK_RE = re.compile(r"\{[\s\S]*\}")


def _load_mdx(slug: str) -> tuple[dict, str]:
    """Lee un MDX por slug. Retorna (frontmatter_text_raw, body)."""
    candidates = list(_MDX_DIR.glob(f"{slug}.mdx")) + list(_MDX_DIR.glob(f"*{slug}.mdx"))
    if not candidates:
        raise FileNotFoundError(f"MDX no encontrado para slug='{slug}' en {_MDX_DIR}")
    mdx_path = candidates[0]
    raw = mdx_path.read_text(encoding="utf-8")
    m = _FRONTMATTER_RE.match(raw)
    if not m:
        return {"_slug": mdx_path.stem, "_raw_frontmatter": ""}, raw
    fm_raw, body = m.group(1), m.group(2)
    fm_dict: dict = {"_slug": mdx_path.stem, "_raw_frontmatter": fm_raw}
    return fm_dict, body


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _load_fewshots(pillar: str) -> str:
    """Renderiza los few-shots del pillar como bloque texto para el system."""
    data = json.loads(_FEWSHOTS_PATH.read_text(encoding="utf-8"))
    examples = data.get(pillar, [])
    parts = [f"## Ejemplos para pillar `{pillar}`\n"]
    for i, ex in enumerate(examples, 1):
        parts.append(f"### Ejemplo {i}")
        parts.append(f"**Input (resumen del MDX):** {ex['input_mdx_summary']}")
        parts.append(f"**Output esperado (JSON):**\n```json\n{json.dumps(ex['output'], ensure_ascii=False, indent=2)}\n```\n")
    return "\n\n".join(parts)


def _extract_json(text: str) -> dict:
    """Extrae el primer objeto JSON balanceado del output. Tolera fences markdown."""
    # Quitar fences ```json ... ``` o ``` ... ```
    cleaned = re.sub(r"```(?:json)?\s*", "", text).replace("```", "")
    m = _JSON_BLOCK_RE.search(cleaned)
    if not m:
        raise ValueError("No se encontró JSON en la respuesta del modelo.")
    return json.loads(m.group(0))


def synthesize(
    slug: str,
    pillar: str,
    *,
    extra_context: str | None = None,
    backend: Backend = "router",
    client=None,
) -> LinkedInPost:
    """Genera un LinkedInPost a partir del MDX `slug` con el ángulo `pillar`.

    `backend`: "router" (default, gratis) o "anthropic" (paga, mejor calidad).
    `extra_context` opcional se inyecta como contexto adicional en el user message
    (ej: "enfócate en el tercer bullet" o "tono más urgente").
    """
    pillar_enum = LinkedInPillar(pillar)
    fm, body = _load_mdx(slug)

    system_prompt = _load_prompt()
    fewshots = _load_fewshots(pillar_enum.value)

    # System: si el backend es Anthropic usamos bloques cacheados; si router, lo
    # plano se concatena dentro de RouterClient
    if backend == "anthropic":
        system_payload = [cached_block(system_prompt), cached_block(fewshots)]
        cli = client or AgentClient()
        model_to_use = ANTHROPIC_MODEL
    elif backend == "router":
        system_payload = [{"type": "text", "text": system_prompt}, {"type": "text", "text": fewshots}]
        cli = client or RouterClient()
        model_to_use = None  # router lo elige
    else:
        raise ValueError(f"backend desconocido: {backend!r}")

    # Mensaje user (varía cada invocación → no cachear)
    user_lines = [
        f"Pillar: `{pillar_enum.value}`",
        f"Slug: `{fm['_slug']}`",
        "",
        "Frontmatter del MDX:",
        "```yaml",
        fm.get("_raw_frontmatter", "(sin frontmatter)"),
        "```",
        "",
        "Cuerpo del MDX:",
        body[:8000],  # límite defensivo, los MDX largos se truncan
    ]
    if extra_context:
        user_lines += ["", "Contexto adicional del usuario:", extra_context]
    user_lines += ["", "Devuelve SOLO el JSON, sin texto antes ni después, sin fences markdown."]

    kwargs = dict(
        agent=AGENT,
        system=system_payload,
        messages=[{"role": "user", "content": "\n".join(user_lines)}],
        max_tokens=2000,
        temperature=0.6,
        input_for_hash={"slug": slug, "pillar": pillar, "backend": backend},
        extra={"slug": slug, "pillar": pillar, "backend": backend},
    )
    if model_to_use:
        kwargs["model"] = model_to_use

    resp = cli.create(**kwargs)

    # Parse + validación con 1 intento de reparación si falla
    try:
        data = _extract_json(resp.text)
    except (ValueError, json.JSONDecodeError):
        repair_msg = (
            "Tu output anterior no era JSON válido. Devuelve SOLO el objeto JSON "
            "que pide el system prompt, sin prosa, sin fences markdown, sin comentarios."
        )
        repair_resp = cli.create(
            **{**kwargs, "messages": kwargs["messages"] + [
                {"role": "assistant", "content": resp.text},
                {"role": "user", "content": repair_msg},
            ]}
        )
        data = _extract_json(repair_resp.text)

    # Forzar slug y pillar al input (defensa contra alucinaciones del modelo)
    data["source_slug"] = fm["_slug"]
    data["pillar"] = pillar_enum.value
    try:
        post = LinkedInPost.model_validate(data)
    except ValidationError as e:
        raise ValueError(
            f"Output del modelo no cumple schema LinkedInPost.\n"
            f"Errors: {e.errors()}\nRaw text:\n{resp.text[:2000]}"
        ) from e
    return post


__all__ = ["synthesize", "AGENT", "ANTHROPIC_MODEL", "Backend"]
