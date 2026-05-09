"""Wrapper de Anthropic SDK para agentes IA de OIA-EE.

Provee:
- `cached_block(text, ttl="ephemeral")`: helper para construir un bloque con cache_control.
- `AgentClient.create(...)`: invoca messages.create con accounting de tokens, costo y latencia,
  loguea automáticamente a JSONL vía run_logger.

Diseñado para anthropic SDK 0.28+ (cache_control ephemeral disponible). Si el caller necesita
streaming o tool use, usa directamente `client.messages.create(...)` y luego `record_usage()`.

Pricing en `_PRICING` se mantiene como dict de referencia (USD por millón de tokens).
Cuando Anthropic actualice precios, modificar aquí.
"""
from __future__ import annotations
import os
import time
from dataclasses import dataclass
from typing import Any

import anthropic

from pipeline.agents.common.run_logger import RunTimer, hash_input, log_run, make_run_id


# USD por millón de tokens. Actualizar cuando Anthropic publique cambios.
_PRICING: dict[str, dict[str, float]] = {
    # Claude 4.x family (estimaciones de referencia)
    "claude-haiku-4-5-20251001": {
        "input": 1.00, "output": 5.00, "cache_read": 0.10, "cache_write": 1.25,
    },
    "claude-haiku-4-5": {
        "input": 1.00, "output": 5.00, "cache_read": 0.10, "cache_write": 1.25,
    },
    "claude-sonnet-4-6": {
        "input": 3.00, "output": 15.00, "cache_read": 0.30, "cache_write": 3.75,
    },
    "claude-opus-4-7": {
        "input": 15.00, "output": 75.00, "cache_read": 1.50, "cache_write": 18.75,
    },
    "claude-opus-4-7[1m]": {
        "input": 15.00, "output": 75.00, "cache_read": 1.50, "cache_write": 18.75,
    },
}


def cached_block(text: str, ttl: str = "ephemeral") -> dict:
    """Construye un bloque text con cache_control. Usar en system o messages content array."""
    return {"type": "text", "text": text, "cache_control": {"type": ttl}}


def estimate_cost_usd(model: str, usage: Any) -> float:
    """Calcula costo USD a partir del usage retornado por la API."""
    pricing = _PRICING.get(model)
    if not pricing:
        return 0.0
    tokens_in = getattr(usage, "input_tokens", 0) or 0
    tokens_out = getattr(usage, "output_tokens", 0) or 0
    tokens_cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
    tokens_cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
    cost = (
        tokens_in * pricing["input"]
        + tokens_out * pricing["output"]
        + tokens_cache_read * pricing["cache_read"]
        + tokens_cache_write * pricing["cache_write"]
    ) / 1_000_000
    return round(cost, 6)


@dataclass
class AgentResponse:
    text: str
    raw: Any  # response object completo
    model: str
    tokens_in: int
    tokens_in_cached: int
    tokens_in_cache_creation: int
    tokens_out: int
    cost_usd: float
    latency_ms: int
    run_id: str
    log_path: str


class AgentClient:
    """Cliente Anthropic ergonómico para agentes."""

    def __init__(self, api_key: str | None = None):
        self.client = anthropic.Anthropic(api_key=api_key or os.environ.get("ANTHROPIC_API_KEY"))

    def create(
        self,
        *,
        agent: str,
        model: str,
        system: str | list[dict],
        messages: list[dict],
        max_tokens: int = 4096,
        temperature: float = 0.7,
        tools: list[dict] | None = None,
        input_for_hash: Any = None,
        extra: dict | None = None,
    ) -> AgentResponse:
        """Invoca messages.create con logging completo. Retorna AgentResponse."""
        run_id = make_run_id()
        ihash = hash_input(input_for_hash if input_for_hash is not None else messages)
        start = time.time()

        kwargs: dict[str, Any] = {
            "model": model,
            "system": system,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools

        try:
            resp = self.client.messages.create(**kwargs)
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            log_run(
                agent, run_id, model=model, status="error", input_hash=ihash,
                latency_ms=latency, error=str(e), extra=extra,
            )
            raise

        latency = int((time.time() - start) * 1000)
        usage = resp.usage
        tokens_in = getattr(usage, "input_tokens", 0) or 0
        tokens_out = getattr(usage, "output_tokens", 0) or 0
        tokens_cached = getattr(usage, "cache_read_input_tokens", 0) or 0
        tokens_cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
        cost = estimate_cost_usd(model, usage)

        # Extract text from first text content block (ignore tool_use blocks)
        text = ""
        for block in resp.content:
            if getattr(block, "type", None) == "text":
                text = block.text
                break

        log_path = log_run(
            agent, run_id, model=model, status="ok", input_hash=ihash,
            tokens_in=tokens_in, tokens_in_cached=tokens_cached,
            tokens_in_cache_creation=tokens_cache_write,
            tokens_out=tokens_out, cost_usd=cost, latency_ms=latency,
            extra=extra,
        )

        return AgentResponse(
            text=text, raw=resp, model=model,
            tokens_in=tokens_in, tokens_in_cached=tokens_cached,
            tokens_in_cache_creation=tokens_cache_write,
            tokens_out=tokens_out, cost_usd=cost, latency_ms=latency,
            run_id=run_id, log_path=str(log_path),
        )


__all__ = ["AgentClient", "AgentResponse", "cached_block", "estimate_cost_usd", "RunTimer"]
