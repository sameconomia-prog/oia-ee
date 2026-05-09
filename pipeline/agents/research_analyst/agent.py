"""Agente B — Quantitative Research Analyst.

Lee un PDF/texto largo, extrae findings cuantitativos verificables con cita,
sugiere patches a los YAML de benchmarks y opcionalmente genera un brief
listo para el Agente A.

Backends:
- "router" (default, gratis): cascada free-ai-stack reordenada por capacidad
  de procesar context grande (DeepSeek primero, luego Qwen, etc.).
- "anthropic": Opus 4.7 1M context con prompt caching del documento.
  Mejor calidad para PDFs >40k tokens. Requiere ANTHROPIC_API_KEY.

Si el documento excede ~30k chars (≈8k tokens) y backend es router, se chunkea
por secciones y los findings se consolidan.

Uso:
    from pipeline.agents.research_analyst.agent import analyze

    out = analyze("path/to/wef_paper.pdf", focus="impacto en contaduría")
    print(out.summary_es)
    for f in out.findings:
        print(f.enunciado, f.confidence)
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Literal

from pydantic import ValidationError

from pipeline.agents.common.anthropic_client import AgentClient, cached_block
from pipeline.agents.common.router_client import RouterClient
from pipeline.agents.common.schemas import ResearchOutput
from pipeline.agents.research_analyst.pdf_loader import DocMeta, load_document

AGENT = "research_analyst"
ANTHROPIC_MODEL = "claude-opus-4-7"
Backend = Literal["router", "anthropic"]

# Para Agente B priorizamos providers con mayor context window y mejor calidad
# en extracción cuantitativa. Mistral small ~32k, Qwen-plus ~128k,
# DeepSeek-chat ~64k, Cerebras llama-3.3-70b ~8k (corto).
_RESEARCH_PROVIDER_ORDER = ["Qwen", "DeepSeek", "Mistral", "OpenRouter", "Cohere", "Cerebras", "ZAI", "Groq"]

_MAX_TEXT_CHARS_PER_CALL = 60_000  # ≈15k tokens; conservador para modelos free
_HERE = Path(__file__).resolve().parent
_PROMPT_PATH = _HERE / "prompts" / "system.md"
_JSON_BLOCK_RE = re.compile(r"\{[\s\S]*\}")
_FENCE_RE = re.compile(r"```(?:json)?\s*")


def _research_router() -> RouterClient:
    from pipeline.ai_router.providers import active_providers
    by_name = {p["name"]: p for p in active_providers()}
    ordered = [by_name[n] for n in _RESEARCH_PROVIDER_ORDER if n in by_name]
    return RouterClient(providers=ordered)


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _strip_fences_and_extract_json(text: str) -> dict:
    cleaned = _FENCE_RE.sub("", text).replace("```", "")
    m = _JSON_BLOCK_RE.search(cleaned)
    if not m:
        raise ValueError(f"No se encontró JSON en la respuesta. Texto:\n{text[:600]}")
    return json.loads(m.group(0))


def _split_doc_chunks(text: str, max_chars: int) -> list[str]:
    """Split por marcadores de página o por párrafos, respetando max_chars."""
    if len(text) <= max_chars:
        return [text]
    page_chunks = re.split(r"\n\[Page \d+\]\n", text)
    out: list[str] = []
    cur = ""
    for ch in page_chunks:
        if not ch.strip():
            continue
        if len(cur) + len(ch) + 2 > max_chars:
            if cur:
                out.append(cur)
            if len(ch) > max_chars:
                # Hard split por mitades
                for i in range(0, len(ch), max_chars):
                    out.append(ch[i:i + max_chars])
                cur = ""
            else:
                cur = ch
        else:
            cur = f"{cur}\n\n{ch}" if cur else ch
    if cur:
        out.append(cur)
    return out


def _consolidate_outputs(parts: list[dict], source_id: str) -> dict:
    """Mergea N JSONs parciales en uno solo (deduplicando por enunciado/skill)."""
    if len(parts) == 1:
        return parts[0]
    consolidated: dict = {
        "source_id": source_id,
        "summary_es": parts[0].get("summary_es", ""),
        "findings": [],
        "skills_emergentes": [],
        "carreras_impactadas": [],
        "yaml_patch_suggestion": [],
        "brief_for_writer": None,
    }
    seen_findings: set[str] = set()
    seen_skills: set[str] = set()
    seen_carreras: set[str] = set()
    for p in parts:
        for f in p.get("findings", []) or []:
            key = f.get("enunciado", "")[:120].lower()
            if key and key not in seen_findings:
                seen_findings.add(key)
                consolidated["findings"].append(f)
        for s in p.get("skills_emergentes", []) or []:
            key = (s.get("nombre", "") + s.get("direccion", "")).lower()
            if key and key not in seen_skills:
                seen_skills.add(key)
                consolidated["skills_emergentes"].append(s)
        for c in p.get("carreras_impactadas", []) or []:
            key = c.get("slug_sugerido", "")
            if key and key not in seen_carreras:
                seen_carreras.add(key)
                consolidated["carreras_impactadas"].append(c)
        for yp in p.get("yaml_patch_suggestion", []) or []:
            consolidated["yaml_patch_suggestion"].append(yp)
        # Si algún chunk produjo brief y no tenemos uno, conservamos el primero
        if not consolidated["brief_for_writer"] and p.get("brief_for_writer"):
            consolidated["brief_for_writer"] = p["brief_for_writer"]
    # Concat summaries con separador si hay varios
    if len(parts) > 1:
        all_summaries = [p.get("summary_es", "") for p in parts if p.get("summary_es")]
        consolidated["summary_es"] = " ".join(all_summaries)[:1500]
    return consolidated


def _build_user_message(doc_text: str, *, focus: str | None, source_id: str,
                        chunk_idx: int | None = None, total_chunks: int | None = None) -> str:
    parts = []
    if total_chunks and total_chunks > 1:
        parts.append(f"## Fragmento {chunk_idx} de {total_chunks} del documento")
        parts.append("(El documento se procesó por chunks. Genera findings parciales sobre ESTA porción solamente. Otros chunks producirán los suyos y todos se consolidarán al final.)")
    else:
        parts.append("## Documento completo")
    parts.append(f"**source_id:** `{source_id}`")
    if focus:
        parts.append(f"**Foco analítico:** {focus}")
    parts.append("")
    parts.append("--- INICIO DEL DOCUMENTO ---")
    parts.append(doc_text)
    parts.append("--- FIN DEL DOCUMENTO ---")
    parts.append("")
    parts.append("Devuelve SOLO el JSON conforme al schema. Sin texto antes ni después.")
    return "\n".join(parts)


def analyze(
    source: str | Path,
    *,
    focus: str | None = None,
    backend: Backend = "router",
    max_chars_per_call: int | None = None,
    client=None,
) -> ResearchOutput:
    """Analiza un documento y devuelve ResearchOutput validado.

    `source` puede ser path local (.pdf, .txt, .md) o URL (http/https).
    `focus` opcional restringe el análisis a un ángulo específico (ej. 'impacto contaduría').
    """
    text, meta = load_document(source)
    if not text.strip():
        raise ValueError(f"Documento vacío o sin texto extraíble: {meta.source_id}")

    max_chars = max_chars_per_call or _MAX_TEXT_CHARS_PER_CALL
    chunks = _split_doc_chunks(text, max_chars)

    system_prompt = _load_prompt()

    if backend == "anthropic":
        cli = client or AgentClient()
        # En Anthropic mantenemos el documento (puede ser largo) cacheado.
        # Cada chunk lleva el system cached + el chunk como user.
        system_payload = [cached_block(system_prompt)]
        model_to_use = ANTHROPIC_MODEL
    elif backend == "router":
        cli = client or _research_router()
        system_payload = [{"type": "text", "text": system_prompt}]
        model_to_use = None
    else:
        raise ValueError(f"backend desconocido: {backend!r}")

    parts: list[dict] = []
    for i, chunk in enumerate(chunks, 1):
        user_msg = _build_user_message(
            chunk, focus=focus, source_id=meta.source_id,
            chunk_idx=i if len(chunks) > 1 else None,
            total_chunks=len(chunks) if len(chunks) > 1 else None,
        )
        kwargs = dict(
            agent=AGENT,
            system=system_payload,
            messages=[{"role": "user", "content": user_msg}],
            max_tokens=4500,
            temperature=0.3,
            input_for_hash={"sha": meta.sha, "chunk": i, "focus": focus, "backend": backend},
            extra={"sha": meta.sha, "chunk": f"{i}/{len(chunks)}", "focus": focus or ""},
        )
        if model_to_use:
            kwargs["model"] = model_to_use
        resp = cli.create(**kwargs)
        try:
            data = _strip_fences_and_extract_json(resp.text)
        except (ValueError, json.JSONDecodeError):
            # 1 retry pidiendo solo JSON puro
            repair = (
                "Tu respuesta anterior no era JSON válido. Devuelve SOLO el JSON "
                "conforme al schema, sin texto antes ni después, sin fences markdown."
            )
            kwargs2 = dict(kwargs)
            kwargs2["messages"] = kwargs["messages"] + [
                {"role": "assistant", "content": resp.text},
                {"role": "user", "content": repair},
            ]
            resp2 = cli.create(**kwargs2)
            data = _strip_fences_and_extract_json(resp2.text)
        # Forzar source_id
        data["source_id"] = meta.source_id
        parts.append(data)

    consolidated = _consolidate_outputs(parts, meta.source_id)

    try:
        return ResearchOutput.model_validate(consolidated)
    except ValidationError as e:
        raise ValueError(
            f"Output del modelo no cumple schema ResearchOutput.\n"
            f"Errors: {e.errors()}\nRaw consolidated:\n{json.dumps(consolidated, ensure_ascii=False)[:1500]}"
        ) from e


__all__ = ["analyze", "AGENT", "ANTHROPIC_MODEL", "Backend"]
