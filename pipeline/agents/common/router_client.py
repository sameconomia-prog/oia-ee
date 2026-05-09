"""RouterClient — wrapper sobre `pipeline.ai_router.FallbackClient`.

Backend OpenAI-compatible con cascada de 8 LLMs gratuitos (Groq, DeepSeek,
Qwen, ZAI, OpenRouter, Cerebras, Cohere, Mistral). Gratis, sin prompt caching,
sin tool use Claude-style.

Diseñado para ser drop-in alternativo a AgentClient cuando el costo/limit de
API Anthropic no se justifica (ej: Agente C — LinkedIn Synthesizer, alto volumen
de output corto).

Uso:

    from pipeline.agents.common.router_client import RouterClient

    cli = RouterClient()
    resp = cli.create(
        agent="linkedin_synth",
        system="Eres editor LinkedIn de OIA-EE...",
        messages=[{"role": "user", "content": "..."}],
    )
    print(resp.text)
    print(resp.provider_used, resp.latency_ms)

Carga `~/Documents/free-ai-stack/.env` automáticamente al import si existe,
con fallback a las env vars del shell.
"""
from __future__ import annotations
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pipeline.agents.common.run_logger import RunTimer, hash_input, log_run, make_run_id

# Auto-cargar free-ai-stack/.env (sin sobrescribir vars ya configuradas)
_FREE_AI_STACK_ENV = Path.home() / "Documents" / "free-ai-stack" / ".env"
if _FREE_AI_STACK_ENV.is_file():
    for line in _FREE_AI_STACK_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and v and not os.environ.get(k):
            os.environ[k] = v

# Import después de cargar .env para que active_providers() vea las keys
from pipeline.ai_router.client import FallbackClient  # noqa: E402


@dataclass
class RouterResponse:
    text: str
    provider_used: str
    model_used: str
    latency_ms: int
    run_id: str
    log_path: str


class RouterClient:
    """Adaptador del FallbackClient con la firma de AgentClient.create()."""

    def __init__(self, providers: list[dict] | None = None):
        self._fc = FallbackClient(providers=providers)

    def create(
        self,
        *,
        agent: str,
        system: str | list[dict],
        messages: list[dict],
        # los siguientes args se aceptan por simetría con AgentClient pero se ignoran
        # (los providers OpenAI-compat no los soportan o no los exponen):
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
        tools: list[dict] | None = None,
        input_for_hash: Any = None,
        extra: dict | None = None,
    ) -> RouterResponse:
        """Invoca el FallbackClient con el primer provider disponible.

        Si `system` viene como lista de bloques (formato Anthropic con cache_control),
        se concatena en un único string. El cache_control se descarta — los providers
        OpenAI-compat no lo soportan.
        """
        run_id = make_run_id()
        ihash = hash_input(input_for_hash if input_for_hash is not None else messages)
        start = time.time()

        # Aplanar system si viene como bloques
        if isinstance(system, list):
            system_str = "\n\n".join(
                b.get("text", "") if isinstance(b, dict) else str(b) for b in system
            )
        else:
            system_str = system or ""

        # Componer historial OpenAI-style
        oai_messages: list[dict] = []
        if system_str:
            oai_messages.append({"role": "system", "content": system_str})
        oai_messages.extend(messages)

        # Capturar provider usado interceptando los logs no es trivial; en su lugar
        # corremos manual la cascada para saber cuál respondió.
        provider_used = "?"
        model_used = "?"
        text = ""
        last_err: Exception | None = None

        for provider in self._fc._providers:
            if provider["name"] in self._fc._dead_providers:
                continue
            try:
                import openai  # local import, openai ya está en deps
                client = openai.OpenAI(
                    base_url=provider["base_url"],
                    api_key=provider["api_key"],
                    timeout=30.0,
                    default_headers=provider.get("extra_headers", {}),
                )
                resp = client.chat.completions.create(
                    model=provider["model"],
                    messages=oai_messages,
                    temperature=temperature if temperature is not None else 0.6,
                )
                text = resp.choices[0].message.content or ""
                provider_used = provider["name"]
                model_used = provider["model"]
                break
            except openai.AuthenticationError as e:
                self._fc._dead_providers.add(provider["name"])
                last_err = e
                continue
            except Exception as e:
                last_err = e
                continue

        latency = int((time.time() - start) * 1000)

        if not text:
            log_run(
                agent, run_id, model="ai_router", status="error",
                input_hash=ihash, latency_ms=latency,
                error=f"all providers failed: {last_err}",
                extra={**(extra or {}), "backend": "ai_router"},
            )
            raise RuntimeError(f"Todos los proveedores fallaron. Último error: {last_err}")

        log_path = log_run(
            agent, run_id, model=f"{provider_used}:{model_used}", status="ok",
            input_hash=ihash, latency_ms=latency, cost_usd=0.0,
            extra={**(extra or {}), "backend": "ai_router", "provider": provider_used},
        )

        return RouterResponse(
            text=text, provider_used=provider_used, model_used=model_used,
            latency_ms=latency, run_id=run_id, log_path=str(log_path),
        )


__all__ = ["RouterClient", "RouterResponse"]
