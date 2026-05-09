"""Pydantic schemas para outputs de los agentes IA.

Centralizado para reusar entre agentes (ej: Agente B genera brief que cumple
EditorialBrief, lo pasa a Agente A; Agente A genera MDX con metadata
EditorialMDX; etc.).
"""
from __future__ import annotations
from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class LinkedInPillar(str, Enum):
    diagnostico_semanal = "diagnostico_semanal"
    metrica_explicada = "metrica_explicada"
    lectura_rectores = "lectura_rectores"
    build_in_public = "build_in_public"


class CarouselSlide(BaseModel):
    titulo: str = Field(..., max_length=80)
    cuerpo: str = Field(..., max_length=200, description="1-2 frases densas")


class LinkedInPost(BaseModel):
    """Output del Agente C — listo para copy-paste a LinkedIn."""

    pillar: LinkedInPillar
    source_slug: str = Field(..., description="Slug del MDX fuente")
    hook: str = Field(..., min_length=20, max_length=240, description="Primera línea, dato fuerte real")
    bullets: list[str] = Field(..., min_length=3, max_length=5)
    cuerpo: str = Field(..., min_length=80, max_length=2000, description="Texto completo del post (LinkedIn permite ~3000 chars; mantener bajo 2000 para legibilidad)")
    cta: str = Field(..., max_length=240, description="Llamada a la acción al final, con link interno OIA-EE")
    hashtags: list[str] = Field(..., min_length=3, description="3-6 hashtags. Si llegan más, se trunca a 6.")
    carousel: list[CarouselSlide] | None = Field(None, description="Versión carrusel 5 slides, opcional")

    @field_validator("hashtags", mode="before")
    @classmethod
    def hashtags_format(cls, v):
        # Aceptamos string separado por espacios o lista
        if isinstance(v, str):
            v = v.split()
        out: list[str] = []
        for tag in v or []:
            t = str(tag).strip().lstrip("#")
            if not t:
                continue
            out.append(f"#{t}")
        # Truncar silenciosamente al máximo permitido (modelos free a veces devuelven 7-8)
        return out[:6]

    @field_validator("hook")
    @classmethod
    def hook_no_markdown(cls, v: str) -> str:
        if v.startswith(("#", "*", "-", ">")):
            raise ValueError("hook no debe empezar con caracter de markdown")
        return v


class EditorialBrief(BaseModel):
    """Brief que el Agente B genera para el Agente A (handoff)."""

    titulo_propuesto: str
    tipo: Literal["analisis", "nota", "investigacion", "carta"]
    benchmark: str | None = None
    tags_sugeridos: list[str]
    angulo_principal: str = Field(..., description="Tesis central en 1-2 frases")
    datos_clave: list[str] = Field(..., description="Métricas con cita obligatoria")
    fuentes_a_citar: list[str]
    palabras_objetivo: int = Field(default=1200, ge=600, le=2500)


# ───────────────────────────────────────────────────────────────────
# Agente B — Quantitative Research Analyst
# ───────────────────────────────────────────────────────────────────


class FindingConfidence(str, Enum):
    alta = "alta"      # cita literal en el documento
    media = "media"    # inferencia de 1 paso desde el texto
    baja = "baja"      # inferencia múltiple o reconstrucción


class Finding(BaseModel):
    """Hallazgo cuantitativo o cualitativo verificable extraído de un documento."""

    enunciado: str = Field(..., min_length=20, max_length=600,
                           description="Afirmación neta en español, lista para citar")
    metric_value: str | None = Field(None, max_length=120,
                                     description="Cifra o magnitud asociada (ej. '47%', '2 años', '14 millones')")
    source_quote: str = Field(..., min_length=10, max_length=600,
                              description="Cita textual del documento que respalda el hallazgo")
    page: str | None = Field(None, max_length=20,
                             description="Página o sección (ej. 'p.12', 'Section 3.2'); null si desconocida")
    confidence: FindingConfidence


class SkillEmergente(BaseModel):
    """Habilidad detectada como emergente (growing) o en declive (declining) por la fuente."""

    nombre: str = Field(..., max_length=200)
    direccion: Literal["growing", "declining", "mixed", "stable"]
    horizonte: Literal["corto", "medio", "largo", "desconocido"] = "desconocido"
    evidencia: str = Field(..., min_length=15, max_length=500,
                           description="Cita o resumen del fragmento que sustenta la clasificación")


class CarreraImpactada(BaseModel):
    """Carrera del catálogo OIA-EE potencialmente afectada por hallazgos del paper."""

    slug_sugerido: str = Field(..., description="Slug benchmark: contaduria, derecho, medicina, etc.")
    magnitud: Literal["alta", "media", "baja"]
    justificacion: str = Field(..., max_length=400)


class YamlPatchSuggestion(BaseModel):
    """Sugerencia de update a api/data/global_benchmarks/<carrera>.yaml."""

    carrera_slug: str
    skill_id: str = Field(..., description="snake-case-id de la skill afectada")
    accion: Literal["agregar_skill", "actualizar_direccion", "actualizar_consenso", "agregar_evidencia"]
    payload: dict = Field(..., description="Datos del patch en el formato YAML actual del benchmark")
    justificacion: str = Field(..., max_length=400)


class ResearchOutput(BaseModel):
    """Output completo del Agente B — documento estructurado y auditable."""

    source_id: str = Field(..., description="Identificador del documento (URL, sha del PDF, título)")
    summary_es: str = Field(..., min_length=80, max_length=1500,
                            description="Resumen ejecutivo en español, 100-300 palabras")
    findings: list[Finding] = Field(..., min_length=1)
    skills_emergentes: list[SkillEmergente] = Field(default_factory=list)
    carreras_impactadas: list[CarreraImpactada] = Field(default_factory=list)
    yaml_patch_suggestion: list[YamlPatchSuggestion] = Field(default_factory=list)
    brief_for_writer: EditorialBrief | None = Field(
        None, description="Si el documento amerita un MDX nuevo, este es el brief listo para Agente A"
    )
