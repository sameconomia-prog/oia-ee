from __future__ import annotations
from collections import Counter
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.benchmarks_loader import load_benchmarks, compute_direction

router = APIRouter()


# ── Response models ───────────────────────────────────────────────────────────

class SourceOut(BaseModel):
    id: str
    nombre: str
    año: int
    metodologia: str
    tipo_evidencia: str
    dato_clave: str
    confianza: str
    peso_geografico: str
    url: str


class CareerSummaryOut(BaseModel):
    slug: str
    nombre: str
    area: str
    total_skills: int
    skills_declining: int
    skills_growing: int
    skills_mixed: int
    skills_sin_datos: int


class SkillConvergenciaOut(BaseModel):
    skill_id: str
    skill_nombre: str
    skill_tipo: str
    accion_curricular: str
    convergencia_por_fuente: dict[str, Optional[str]]
    direccion_global: str
    horizonte_dominante: Optional[str]
    fuentes_con_datos: int
    consenso_pct: int


class CareerDetailOut(BaseModel):
    slug: str
    nombre: str
    area: str
    skills: list[SkillConvergenciaOut]


class SkillHallazgoOut(BaseModel):
    fuente_id: str
    fuente_nombre: str
    direccion: str
    horizonte_impacto: str
    hallazgo: str
    dato_clave: str
    cita_textual: str


class SkillCrossSourceOut(BaseModel):
    skill_id: str
    hallazgos: list[SkillHallazgoOut]


class SkillIndexItemOut(BaseModel):
    skill_id: str
    skill_nombre: str
    skill_tipo: str
    direccion_global: str
    fuentes_con_datos: int
    consenso_pct: int
    carreras: list[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_skill_convergencia(skill: dict, skill_index: dict, sources: dict) -> SkillConvergenciaOut:
    skill_id = skill["id"]
    by_fuente = skill_index.get(skill_id, {})

    convergencia: dict[str, Optional[str]] = {fid: None for fid in sources}
    for fuente_id, hallazgo in by_fuente.items():
        convergencia[fuente_id] = hallazgo["direccion"]

    horizontes = [h["horizonte_impacto"] for h in by_fuente.values()]
    horizonte_dominante = Counter(horizontes).most_common(1)[0][0] if horizontes else None

    global_dir = compute_direction(by_fuente)
    fuentes_con_datos = len(by_fuente)
    if fuentes_con_datos and global_dir not in ("sin_datos", "mixed"):
        agreeing = sum(1 for h in by_fuente.values() if h["direccion"] == global_dir)
        consenso_pct = round(agreeing / fuentes_con_datos * 100)
    elif global_dir == "mixed":
        consenso_pct = 50
    else:
        consenso_pct = 0

    return SkillConvergenciaOut(
        skill_id=skill_id,
        skill_nombre=skill["nombre"],
        skill_tipo=skill["tipo"],
        accion_curricular=skill["accion_curricular"],
        convergencia_por_fuente=convergencia,
        direccion_global=global_dir,
        horizonte_dominante=horizonte_dominante,
        fuentes_con_datos=fuentes_con_datos,
        consenso_pct=consenso_pct,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/sources", response_model=list[SourceOut], summary="Lista de fuentes globales")
def get_sources():
    sources, _, _ = load_benchmarks()
    return [
        SourceOut(
            id=s["fuente"]["id"],
            nombre=s["fuente"]["nombre"],
            año=s["fuente"]["año"],
            metodologia=s["fuente"]["metodologia"],
            tipo_evidencia=s["fuente"]["tipo_evidencia"],
            dato_clave=s["fuente"]["dato_clave"],
            confianza=s["fuente"]["confianza"],
            peso_geografico=s["fuente"]["peso_geografico"],
            url=s["fuente"]["url"],
        )
        for s in sources.values()
    ]


@router.get("/careers", response_model=list[CareerSummaryOut], summary="Resumen de carreras")
def get_careers():
    sources, career_map, skill_index = load_benchmarks()
    result = []
    for carrera in career_map["carreras"]:
        counts: dict[str, int] = {"declining": 0, "growing": 0, "mixed": 0,
                                   "stable": 0, "sin_datos": 0}
        for skill in carrera["skills"]:
            d = compute_direction(skill_index.get(skill["id"], {}))
            counts[d if d in counts else "sin_datos"] += 1
        result.append(CareerSummaryOut(
            slug=carrera["slug"],
            nombre=carrera["nombre"],
            area=carrera["area"],
            total_skills=len(carrera["skills"]),
            skills_declining=counts["declining"],
            skills_growing=counts["growing"],
            skills_mixed=counts["mixed"] + counts["stable"],
            skills_sin_datos=counts["sin_datos"],
        ))
    return result


@router.get("/careers/{career_slug}", response_model=CareerDetailOut,
            summary="Detalle de carrera con matriz de convergencia")
def get_career_detail(career_slug: str):
    sources, career_map, skill_index = load_benchmarks()
    carrera = next((c for c in career_map["carreras"] if c["slug"] == career_slug), None)
    if not carrera:
        raise HTTPException(status_code=404, detail=f"Carrera '{career_slug}' no encontrada")
    return CareerDetailOut(
        slug=carrera["slug"],
        nombre=carrera["nombre"],
        area=carrera["area"],
        skills=[_build_skill_convergencia(s, skill_index, sources) for s in carrera["skills"]],
    )


@router.get("/resumen", summary="Resumen estadístico de todos los benchmarks globales")
def get_resumen():
    """Estadísticas agregadas: carreras, fuentes, skills por dirección."""
    sources, career_map, skill_index = load_benchmarks()
    carreras = career_map.get("carreras", [])
    total_skills = sum(len(c["skills"]) for c in carreras)
    direction_counts: Counter = Counter()
    accion_counts: Counter = Counter()
    for c in carreras:
        for skill in c["skills"]:
            d = compute_direction(skill_index.get(skill["id"], {}))
            direction_counts[d] += 1
            accion_counts[skill.get("accion_curricular", "sin_datos")] += 1
    return {
        "total_carreras": len(carreras),
        "total_fuentes": len(sources),
        "total_skills": total_skills,
        "skills_declining": direction_counts["declining"],
        "skills_growing": direction_counts["growing"],
        "skills_mixed_stable": direction_counts["mixed"] + direction_counts["stable"],
        "skills_sin_datos": direction_counts["sin_datos"],
        "acciones": dict(accion_counts),
    }


@router.get("/skills", response_model=list[SkillIndexItemOut], summary="Índice de todas las skills")
def get_skills_index():
    """Lista todas las skills con su dirección global y en qué carreras aparecen."""
    sources, career_map, skill_index = load_benchmarks()
    skill_careers: dict[str, list[str]] = {}
    skill_meta: dict[str, dict] = {}
    for carrera in career_map["carreras"]:
        for skill in carrera["skills"]:
            sid = skill["id"]
            skill_careers.setdefault(sid, []).append(carrera["slug"])
            if sid not in skill_meta:
                skill_meta[sid] = skill

    result = []
    for sid, skill in skill_meta.items():
        by_fuente = skill_index.get(sid, {})
        global_dir = compute_direction(by_fuente)
        fuentes_con_datos = len(by_fuente)
        if fuentes_con_datos and global_dir not in ("sin_datos", "mixed"):
            agreeing = sum(1 for h in by_fuente.values() if h["direccion"] == global_dir)
            consenso_pct = round(agreeing / fuentes_con_datos * 100)
        elif global_dir == "mixed":
            consenso_pct = 50
        else:
            consenso_pct = 0
        result.append(SkillIndexItemOut(
            skill_id=sid,
            skill_nombre=skill["nombre"],
            skill_tipo=skill["tipo"],
            direccion_global=global_dir,
            fuentes_con_datos=fuentes_con_datos,
            consenso_pct=consenso_pct,
            carreras=skill_careers.get(sid, []),
        ))
    return sorted(result, key=lambda s: (s.direccion_global, s.skill_nombre))


@router.get("/skills/{skill_id}", response_model=SkillCrossSourceOut,
            summary="Hallazgos de todas las fuentes para una skill")
def get_skill_cross_source(skill_id: str):
    sources, career_map, skill_index = load_benchmarks()
    all_skill_ids = {s["id"] for c in career_map["carreras"] for s in c["skills"]}
    if skill_id not in all_skill_ids:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' no encontrada")
    by_fuente = skill_index.get(skill_id, {})
    return SkillCrossSourceOut(
        skill_id=skill_id,
        hallazgos=[
            SkillHallazgoOut(
                fuente_id=fid,
                fuente_nombre=sources[fid]["fuente"]["nombre"],
                direccion=h["direccion"],
                horizonte_impacto=h["horizonte_impacto"],
                hallazgo=h["hallazgo"],
                dato_clave=h["dato_clave"],
                cita_textual=h["cita_textual"],
            )
            for fid, h in by_fuente.items()
        ],
    )
