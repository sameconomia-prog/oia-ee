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
    cuerpo: str = Field(..., min_length=80, max_length=900, description="Texto completo del post (sin hook ni CTA, bullets ya integrados con prefijos visuales)")
    cta: str = Field(..., max_length=200, description="Llamada a la acción al final, con link interno OIA-EE")
    hashtags: list[str] = Field(..., min_length=3, max_length=6)
    carousel: list[CarouselSlide] | None = Field(None, description="Versión carrusel 5 slides, opcional")

    @field_validator("hashtags")
    @classmethod
    def hashtags_format(cls, v: list[str]) -> list[str]:
        out = []
        for tag in v:
            t = tag.strip().lstrip("#")
            if not t:
                continue
            out.append(f"#{t}")
        return out

    @field_validator("hook")
    @classmethod
    def hook_no_markdown(cls, v: str) -> str:
        if v.startswith(("#", "*", "-", ">")):
            raise ValueError("hook no debe empezar con caracter de markdown")
        return v


class EditorialBrief(BaseModel):
    """Brief que el Agente B genera para el Agente A (handoff)."""

    titulo_propuesto: str
    tipo: Literal["analisis", "nota", "investigacion"]
    benchmark: str | None = None
    tags_sugeridos: list[str]
    angulo_principal: str = Field(..., description="Tesis central en 1-2 frases")
    datos_clave: list[str] = Field(..., description="Métricas con cita obligatoria")
    fuentes_a_citar: list[str]
    palabras_objetivo: int = Field(default=1200, ge=600, le=2500)
