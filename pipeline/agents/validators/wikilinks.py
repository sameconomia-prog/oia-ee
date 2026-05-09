"""Detector de wikilinks rotos.

Extrae todas las rutas internas (`/investigaciones/<slug>`, `/benchmarks/<slug>`, etc.)
del MDX y verifica que el destino exista físicamente en el repo o en la lista de
slugs benchmark.

Rutas conocidas que SÍ existen como recursos:
- /investigaciones/<slug>          → frontend/src/content/investigaciones/<slug>.mdx
- /benchmarks                      → ruta producto
- /benchmarks/<slug>               → contra lista API benchmark_slugs (17)
- /benchmarks/skills               → ruta producto
- /benchmarks/skills/<id>          → no validamos id, asumimos OK
- /pertinencia                     → ruta producto
- /estadisticas, /carreras, /ies, /comparar, /rector, /planes, /investigaciones
"""
from __future__ import annotations
import re
from dataclasses import dataclass
from pathlib import Path

_LINK_RE = re.compile(r"(?:\]\(|<|\s|^)(\/[a-z][\w/\-]*)", re.MULTILINE)
_PRODUCT_PATHS = {
    "/benchmarks", "/benchmarks/skills",
    "/pertinencia", "/estadisticas", "/carreras", "/ies",
    "/comparar", "/rector", "/planes", "/investigaciones",
    "/noticias", "/vacantes", "/skills", "/predicciones",
    "/sobre-nosotros", "/sobre", "/api", "/auth/login",
}

_INVESTIGACIONES_DIR = Path(__file__).resolve().parents[3] / "frontend" / "src" / "content" / "investigaciones"


@dataclass
class WikilinkHit:
    path: str
    pos: int
    valid: bool
    reason: str  # "ok" | "investigacion_inexistente" | "benchmark_no_listado" | "ruta_inventada"


def _list_existing_slugs() -> set[str]:
    if not _INVESTIGACIONES_DIR.exists():
        return set()
    return {p.stem for p in _INVESTIGACIONES_DIR.glob("*.mdx")}


def _benchmark_slugs() -> set[str]:
    """Carga slugs benchmark vía API tool. Si falla, retorna empty (skip validación)."""
    try:
        from pipeline.agents.tools.kpi import list_benchmark_slugs
        return set(list_benchmark_slugs())
    except Exception:
        return set()


def scan_wikilinks(mdx_body: str) -> list[WikilinkHit]:
    """Extrae rutas internas y valida cada una. NO bloquea — sólo reporta."""
    existing_slugs = _list_existing_slugs()
    bench_slugs = _benchmark_slugs()
    hits: list[WikilinkHit] = []
    seen: set[tuple[str, int]] = set()

    for m in _LINK_RE.finditer(mdx_body):
        path = m.group(1).rstrip(".,);")
        # Normalizar trailing slash
        path_norm = path.rstrip("/")
        key = (path_norm, m.start())
        if key in seen:
            continue
        seen.add(key)

        # Caso 1: /investigaciones/<slug>
        if path_norm.startswith("/investigaciones/"):
            slug = path_norm.removeprefix("/investigaciones/")
            valid = slug in existing_slugs
            hits.append(WikilinkHit(
                path=path_norm, pos=m.start(),
                valid=valid,
                reason="ok" if valid else "investigacion_inexistente",
            ))
            continue

        # Caso 2: /benchmarks/<slug>
        if path_norm.startswith("/benchmarks/") and path_norm not in {"/benchmarks/skills"}:
            slug = path_norm.removeprefix("/benchmarks/")
            # Si subruta /benchmarks/skills/<id> u otra, asumimos OK sin validar
            if "/" in slug:
                hits.append(WikilinkHit(path=path_norm, pos=m.start(), valid=True, reason="ok"))
                continue
            valid = (not bench_slugs) or (slug in bench_slugs)  # skip si no hay lista
            hits.append(WikilinkHit(
                path=path_norm, pos=m.start(),
                valid=valid,
                reason="ok" if valid else "benchmark_no_listado",
            ))
            continue

        # Caso 3: ruta producto exacta
        if path_norm in _PRODUCT_PATHS:
            hits.append(WikilinkHit(path=path_norm, pos=m.start(), valid=True, reason="ok"))
            continue

        # Caso 4: subpath de ruta producto (ej /admin/foo)
        if any(path_norm.startswith(p + "/") for p in _PRODUCT_PATHS):
            hits.append(WikilinkHit(path=path_norm, pos=m.start(), valid=True, reason="ok"))
            continue

        # Caso 5: ruta inventada
        hits.append(WikilinkHit(
            path=path_norm, pos=m.start(),
            valid=False,
            reason="ruta_inventada",
        ))

    return hits


def wikilinks_summary(mdx_body: str) -> dict:
    hits = scan_wikilinks(mdx_body)
    if not hits:
        return {"total": 0, "valid": 0, "invalid": 0, "invalid_paths": []}
    valid = [h for h in hits if h.valid]
    invalid = [h for h in hits if not h.valid]
    return {
        "total": len(hits),
        "valid": len(valid),
        "invalid": len(invalid),
        "invalid_paths": [{"path": h.path, "reason": h.reason} for h in invalid],
    }


__all__ = ["scan_wikilinks", "wikilinks_summary", "WikilinkHit"]
