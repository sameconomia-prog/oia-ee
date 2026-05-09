"""Tools de KPI: kpi_lookup + benchmark_lookup contra el API público real.

Endpoints usados:
- /publico/benchmarks/careers (lista para resolver slug)
- /publico/benchmarks/careers/{slug} (detalle)
- /publico/benchmarks/resumen (estadísticas globales como contexto)
"""
from __future__ import annotations
from functools import lru_cache

from pipeline.agents.tools._http import get_json


@lru_cache(maxsize=1)
def _careers_index() -> list[dict]:
    """Lista de careers benchmark, cacheada por sesión."""
    data = get_json("/publico/benchmarks/careers")
    if not isinstance(data, list):
        return []
    return data


def list_benchmark_slugs() -> list[str]:
    """Slugs disponibles (17 carreras benchmark)."""
    return [c.get("slug", "") for c in _careers_index() if c.get("slug")]


def benchmark_lookup(slug: str) -> dict | None:
    """Detalle de benchmark por slug. Retorna dict con urgencia_curricular, skills_*, carrera, etc."""
    if not slug:
        return None
    return get_json(f"/publico/benchmarks/careers/{slug}")


def _careers_summary_by_slug(slug: str) -> dict | None:
    """Item de la lista resumida (donde vienen urgencia + counts agregados)."""
    for c in _careers_index():
        if c.get("slug") == slug:
            return c
    return None


def kpi_lookup(carrera_slug: str, metric: str = "summary") -> dict | None:
    """Vista compacta tipo KPI de una carrera benchmark.

    metric:
    - "summary" (default): urgencia + counts agregados + top 3 skills declining/growing
    - "all": dict completo del benchmark (incluye matriz skills y convergencia por fuente)
    """
    if metric == "all":
        return benchmark_lookup(carrera_slug)

    summary_row = _careers_summary_by_slug(carrera_slug)
    detail = benchmark_lookup(carrera_slug)
    if not summary_row and not detail:
        return None

    out = {
        "slug": carrera_slug,
        "nombre": (detail or {}).get("nombre") or (summary_row or {}).get("nombre") or carrera_slug,
        "area": (detail or {}).get("area") or (summary_row or {}).get("area"),
    }
    if summary_row:
        out.update({
            "urgencia_curricular": summary_row.get("urgencia_curricular"),
            "total_skills": summary_row.get("total_skills"),
            "skills_declining": summary_row.get("skills_declining"),
            "skills_growing": summary_row.get("skills_growing"),
            "skills_mixed": summary_row.get("skills_mixed"),
            "skills_sin_datos": summary_row.get("skills_sin_datos"),
        })

    skills = (detail or {}).get("skills") or []
    if isinstance(skills, list):
        decl = sorted(
            [s for s in skills if s.get("direccion_global") == "declining"],
            key=lambda s: -(s.get("consenso_pct") or 0),
        )[:3]
        grow = sorted(
            [s for s in skills if s.get("direccion_global") == "growing"],
            key=lambda s: -(s.get("consenso_pct") or 0),
        )[:3]
        out["top_declining"] = [
            {
                "skill": s.get("skill_nombre"),
                "tipo": s.get("skill_tipo"),
                "consenso_pct": s.get("consenso_pct"),
                "horizonte": s.get("horizonte_dominante"),
                "accion": s.get("accion_curricular"),
            }
            for s in decl
        ]
        out["top_growing"] = [
            {
                "skill": s.get("skill_nombre"),
                "tipo": s.get("skill_tipo"),
                "consenso_pct": s.get("consenso_pct"),
                "horizonte": s.get("horizonte_dominante"),
                "accion": s.get("accion_curricular"),
            }
            for s in grow
        ]
    out["fuentes_internacionales"] = ["WEF 2025", "McKinsey 2023", "CEPAL 2023", "Frey-Osborne 2013", "Eloundou/Anthropic 2025"]
    return out


__all__ = ["kpi_lookup", "benchmark_lookup", "list_benchmark_slugs"]
