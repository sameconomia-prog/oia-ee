"""Rule-based news classifier — free drop-in replacement for ClaudeClient."""
import re
from typing import Optional
from pipeline.utils.claude_client import NoticiasClassification

_SECTOR_KEYWORDS: dict[str, list[str]] = {
    "tecnologia": [
        "tecnolog", "software", "tech", "ia ", "ai ", "inteligencia artificial",
        "machine learning", "robot", "automati", "digital", "computa", "silicon",
        "startup", "algoritm", "chatgpt", "openai", "google", "microsoft", "amazon",
        "meta ", "apple", "nvidia", "programad", "desarroll", "código", "data",
    ],
    "manufactura": [
        "manufactur", "fábrica", "fabrica", "industri", "producción", "planta",
        "automotri", "automovil", "ford", "toyota", "tesla", "gm ", "volkswagen",
        "ensambl", "obrero", "sindical", "trabajador",
    ],
    "finanzas": [
        "banco", "financ", "bolsa", "mercado", "inversión", "inversion", "capital",
        "cripto", "bitcoin", "blockchain", "seguro", "jpmorgan", "goldman", "citibank",
        "contabilidad", "contable", "actuar",
    ],
    "salud": [
        "salud", "médic", "medic", "hospital", "clínic", "clinic", "farmac",
        "diagnóstic", "diagnostic", "biomed", "enfermería", "paciente", "cirugía",
    ],
    "educacion": [
        "educac", "universi", "escuela", "alumno", "student", "profesor", "docente",
        "currículo", "curricul", "aprendizaj", "formación", "capacitaci",
    ],
    "comercio": [
        "retail", "tienda", "venta", "comercio", "ecommerce", "amazon", "walmart",
        "logística", "logistica", "entrega", "supply chain", "minorista",
    ],
}

_IMPACTO_KEYWORDS: dict[str, list[str]] = {
    "despido_masivo": [
        "despido", "layoff", "recorte", "elimina", "prescindirá", "prescinde",
        "reducción de personal", "reduccion de personal", "desempleo", "pierde empleo",
        "pérdida de empleos", "perdida de empleos", "miles de empleados",
    ],
    "adopcion_ia": [
        "adopta", "implementa", "integra", "lanza", "introduce", "despliega",
        "invierte en ia", "invierte en ai", "usa ia", "usa ai", "incorpora ia",
        "herramienta ia", "automatiza",
    ],
    "nueva_carrera": [
        "nueva carrera", "nuevo empleo", "nuevos empleos", "crea empleos",
        "oportunidad", "demanda de", "busca profesional", "oferta laboral",
        "vacante", "contrata", "hiring",
    ],
    "regulacion": [
        "regulaci", "ley ", "legislaci", "norma ", "política ", "gobierno",
        "congreso", "senado", "unión europea", "gdpr", "acto de ia", "ai act",
        "restricci", "prohibi",
    ],
}

_CAUSA_KEYWORDS = [
    "chatgpt", "gpt-4", "gpt4", "llm", "large language model", "modelo de lenguaje",
    "machine learning", "deep learning", "automatización", "automatizacion",
    "robot", "computer vision", "visión computacional", "ia generativa",
    "generative ai", "inteligencia artificial", "algoritmo", "copilot",
]


def _match(text: str, keywords: list[str]) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)


def _detect_sector(text: str) -> str:
    for sector, kws in _SECTOR_KEYWORDS.items():
        if _match(text, kws):
            return sector
    return "otro"


def _detect_impacto(text: str) -> str:
    for impacto, kws in _IMPACTO_KEYWORDS.items():
        if _match(text, kws):
            return impacto
    return "otro"


def _detect_causa(text: str) -> Optional[str]:
    text_lower = text.lower()
    for kw in _CAUSA_KEYWORDS:
        if kw in text_lower:
            return kw.title()
    return None


def _extract_empresa(titulo: str) -> Optional[str]:
    """Heuristic: first capitalized word sequence that looks like a company name."""
    candidates = re.findall(r'\b[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*\b', titulo)
    stopwords = {"La", "El", "Los", "Las", "Un", "Una", "De", "Del", "En", "Por",
                 "Con", "Para", "The", "And", "For", "How", "Why", "When", "New"}
    filtered = [c for c in candidates if c not in stopwords and len(c) > 2]
    return filtered[0] if filtered else None


class RuleClassifier:
    """Keyword-based classifier. No API key, no cost, works offline."""

    def clasificar_noticia(self, titulo: str, contenido: str) -> Optional[NoticiasClassification]:
        text = f"{titulo} {contenido}"
        resumen = titulo[:250] if titulo else "Sin título"
        return NoticiasClassification(
            sector=_detect_sector(text),
            tipo_impacto=_detect_impacto(text),
            n_empleados_afectados=None,
            empresa=_extract_empresa(titulo),
            causa_ia=_detect_causa(text),
            resumen=resumen,
        )
