# pipeline/radar/extractor.py
"""Extrae datos estructurados de noticias. Cadena: Groq → Claude Haiku → None."""
import json
import os
import structlog
from dataclasses import dataclass, field
from typing import Optional
import anthropic
from pipeline.radar.groq_classifier import call_groq

logger = structlog.get_logger()

_HAIKU_MODEL = "claude-haiku-4-5-20251001"

_DESPIDO_SCHEMA = {
    "empresa": "string",
    "pais": "string (ISO 3166 2-char)",
    "sector": "string",
    "fecha_anuncio": "string YYYY-MM-DD",
    "numero_despidos": "integer or null",
    "rango_min_despidos": "integer or null",
    "rango_max_despidos": "integer or null",
    "salario_promedio_usd": "float or null",
    "ia_tecnologia": "string (nombre específico) or null",
    "area_reemplazada": "string or null",
    "porcentaje_fuerza_laboral": "float 0-1 or null",
    "es_reemplazo_total": "boolean or null",
    "confiabilidad": "alta | media | baja",
}

_EMPLEO_SCHEMA = {
    "empresa": "string",
    "pais": "string (ISO 3166 2-char)",
    "sector": "string",
    "fecha_anuncio": "string YYYY-MM-DD",
    "numero_empleos": "integer or null",
    "tipo_contrato": "permanente | temporal | freelance | null",
    "titulo_puesto": "string or null",
    "habilidades_requeridas": "array of strings",
    "salario_min_usd": "float or null",
    "salario_max_usd": "float or null",
    "ia_tecnologia_usada": "string or null",
    "confiabilidad": "alta | media | baja",
}


@dataclass
class ExtractedDespido:
    empresa: str
    pais: str
    sector: Optional[str]
    fecha_anuncio: str
    numero_despidos: Optional[int] = None
    rango_min_despidos: Optional[int] = None
    rango_max_despidos: Optional[int] = None
    salario_promedio_usd: Optional[float] = None
    ia_tecnologia: Optional[str] = None
    area_reemplazada: Optional[str] = None
    porcentaje_fuerza_laboral: Optional[float] = None
    es_reemplazo_total: Optional[bool] = None
    confiabilidad: str = "baja"


@dataclass
class ExtractedEmpleo:
    empresa: str
    pais: str
    sector: Optional[str]
    fecha_anuncio: str
    numero_empleos: Optional[int] = None
    tipo_contrato: Optional[str] = None
    titulo_puesto: Optional[str] = None
    habilidades_requeridas: list = field(default_factory=list)
    salario_min_usd: Optional[float] = None
    salario_max_usd: Optional[float] = None
    ia_tecnologia_usada: Optional[str] = None
    confiabilidad: str = "baja"


def _call_haiku(prompt: str, api_key: str) -> Optional[str]:
    client = anthropic.Anthropic(api_key=api_key)
    try:
        resp = client.messages.create(
            model=_HAIKU_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text
    except Exception as e:
        logger.error("haiku_call_failed", error=str(e))
        return None


def _resolve_raw(prompt: str, groq_key: Optional[str], anthropic_key: Optional[str]) -> Optional[str]:
    """Intenta Groq primero, luego Claude Haiku. Retorna texto crudo parseable o None."""
    if groq_key:
        raw = call_groq(prompt, groq_key)
        if raw is not None:
            if raw.strip() == "null" or _parse_json_response(raw) is not None:
                return raw
    if anthropic_key:
        return _call_haiku(prompt, anthropic_key)
    return None


def _parse_json_response(raw: Optional[str]) -> Optional[dict]:
    if not raw or raw.strip() == "null":
        return None
    try:
        data = json.loads(raw.strip())
        if not data or not isinstance(data, dict):
            return None
        return data
    except (json.JSONDecodeError, TypeError):
        return None


def extract_despido_event(
    article_text: str,
    api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
) -> Optional[ExtractedDespido]:
    """Extrae evento de despido por IA. Usa Groq → Claude → None."""
    groq_key = groq_api_key if groq_api_key is not None else os.getenv("GROQ_API_KEY", "") or None
    anthropic_key = api_key if api_key is not None else os.getenv("ANTHROPIC_API_KEY", "") or None

    schema_str = json.dumps(_DESPIDO_SCHEMA, ensure_ascii=False, indent=2)
    prompt = f"""Extrae de este artículo datos sobre despidos causados por implementación de IA.
Devuelve SOLO un objeto JSON con este schema (usa null si no está disponible):
{schema_str}

Artículo:
{article_text[:3000]}

IMPORTANTE: Si el artículo NO describe despidos por IA, devuelve: null
Responde SOLO con el JSON o null, sin explicación."""

    raw = _resolve_raw(prompt, groq_key, anthropic_key)
    data = _parse_json_response(raw)
    if data is None:
        return None
    try:
        return ExtractedDespido(**{k: data.get(k) for k in ExtractedDespido.__dataclass_fields__})
    except TypeError as e:
        logger.warning("despido_extract_parse_error", error=str(e))
        return None


def extract_empleo_event(
    article_text: str,
    api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
) -> Optional[ExtractedEmpleo]:
    """Extrae evento de empleo por IA. Usa Groq → Claude → None."""
    groq_key = groq_api_key if groq_api_key is not None else os.getenv("GROQ_API_KEY", "") or None
    anthropic_key = api_key if api_key is not None else os.getenv("ANTHROPIC_API_KEY", "") or None

    schema_str = json.dumps(_EMPLEO_SCHEMA, ensure_ascii=False, indent=2)
    prompt = f"""Extrae de este artículo datos sobre empleos NUEVOS creados por empresas que usan IA.
Devuelve SOLO un objeto JSON con este schema (usa null si no está disponible):
{schema_str}

Artículo:
{article_text[:3000]}

IMPORTANTE: Si el artículo NO describe creación de empleos relacionados con IA, devuelve: null
Responde SOLO con el JSON o null, sin explicación."""

    raw = _resolve_raw(prompt, groq_key, anthropic_key)
    data = _parse_json_response(raw)
    if data is None:
        return None
    try:
        return ExtractedEmpleo(**{k: data.get(k) for k in ExtractedEmpleo.__dataclass_fields__})
    except TypeError as e:
        logger.warning("empleo_extract_parse_error", error=str(e))
        return None
