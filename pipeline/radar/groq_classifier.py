# pipeline/radar/groq_classifier.py
"""Clasificador LLM con fallback automático (8 proveedores gratuitos).

Prioridad: Groq → DeepSeek → Qwen → ZAI → OpenRouter → Cerebras → Cohere → Mistral.
Si todos fallan, retorna None — extractor.py intenta Claude Haiku como último recurso.
"""
from typing import Optional
import structlog
from pipeline.ai_router import FallbackClient

logger = structlog.get_logger()


def call_groq(prompt: str, api_key: str) -> Optional[str]:
    """Llama al stack de LLMs con fallback. api_key ignorado — usa env vars."""
    try:
        client = FallbackClient()
        return client.chat(prompt, system="")
    except RuntimeError as e:
        logger.error("fallback_all_failed", error=str(e))
        return None
