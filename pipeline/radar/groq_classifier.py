# pipeline/radar/groq_classifier.py
"""LLM call via Groq Free Tier (llama-3.1-8b-instant)."""
from typing import Optional
import structlog
from groq import Groq

logger = structlog.get_logger()

_GROQ_MODEL = "llama-3.1-8b-instant"


def call_groq(prompt: str, api_key: str) -> Optional[str]:
    """Llama a Groq API. Retorna texto crudo o None en error."""
    try:
        client = Groq(api_key=api_key, timeout=10.0)
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.error("groq_call_failed", error=str(e))
        return None
