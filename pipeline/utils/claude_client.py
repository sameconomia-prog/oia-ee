import json
import logging
from dataclasses import dataclass
from typing import Optional
import anthropic

logger = logging.getLogger(__name__)

_CLASIFICADOR_SYSTEM = """Eres un clasificador de noticias sobre impacto de la IA en educación y empleo.
Dada una noticia, extrae: sector industrial, tipo de impacto, número de empleados afectados, empresa,
causa_ia (qué tecnología de IA causó el impacto), y un resumen de 2-3 líneas en español.

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "sector": "<tecnologia|manufactura|finanzas|salud|educacion|comercio|otro>",
  "tipo_impacto": "<despido_masivo|adopcion_ia|nueva_carrera|regulacion|otro>",
  "n_empleados_afectados": <int o null>,
  "empresa": "<nombre o null>",
  "causa_ia": "<descripción breve o null>",
  "resumen": "<2-3 oraciones en español>"
}"""


@dataclass
class NoticiasClassification:
    sector: str
    tipo_impacto: str
    n_empleados_afectados: Optional[int]
    empresa: Optional[str]
    causa_ia: Optional[str]
    resumen: str


class ClaudeClient:
    def __init__(self, api_key: str, model: str = "claude-haiku-4-5-20251001"):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model
        self._cached_system = [
            {
                "type": "text",
                "text": _CLASIFICADOR_SYSTEM,
                "cache_control": {"type": "ephemeral"},
            }
        ]

    def clasificar_noticia(self, titulo: str, contenido: str) -> Optional[NoticiasClassification]:
        """Classifies a news article with Claude. Returns None on failure."""
        user_text = f"Título: {titulo}\n\nContenido: {contenido[:2000]}"
        try:
            msg = self._client.messages.create(
                model=self._model,
                max_tokens=300,
                system=self._cached_system,
                messages=[{"role": "user", "content": user_text}],
            )
            raw = msg.content[0].text.strip()
            data = json.loads(raw)
            return NoticiasClassification(
                sector=data.get("sector", "otro"),
                tipo_impacto=data.get("tipo_impacto", "otro"),
                n_empleados_afectados=data.get("n_empleados_afectados"),
                empresa=data.get("empresa"),
                causa_ia=data.get("causa_ia"),
                resumen=data.get("resumen", ""),
            )
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            logger.warning("Claude clasificador error: %s", e)
            return None
        except anthropic.APIError as e:
            logger.error("Claude API error: %s", e)
            return None
