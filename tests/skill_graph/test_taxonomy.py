import re
from datetime import date, timedelta

from pipeline.skill_graph.taxonomy import (
    REVISION_DIAS,
    build_capability_frontier_info,
    dias_desde_evaluacion,
    get_ia_label,
    get_ia_score,
    get_taxonomy_meta,
)


def test_skill_clasificado_correctamente():
    assert get_ia_label("python") == "augmented"
    assert get_ia_label("facturación") == "automated"
    assert get_ia_label("liderazgo") == "resilient"


def test_normalizacion_mayusculas_y_espacios():
    assert get_ia_label("  Python  ") == "augmented"
    assert get_ia_label("LIDERAZGO") == "resilient"


def test_skill_desconocido_retorna_unknown():
    assert get_ia_label("habilidad_inexistente_xyz") == "unknown"


def test_score_automated_mayor_que_resilient():
    assert get_ia_score("facturación") > get_ia_score("liderazgo")
    assert get_ia_score("facturación") == 0.9
    assert get_ia_score("liderazgo") == 0.1
    assert get_ia_score("python") == 0.5


def test_score_desconocido_es_medio():
    assert get_ia_score("skill_xyz") == 0.5


def test_meta_no_contamina_el_mapping():
    # las claves del bloque meta no deben tratarse como skills ni como niveles
    assert get_ia_label("version") == "unknown"
    assert get_ia_label("capability_frontier") == "unknown"


def test_get_taxonomy_meta_expone_version_modelo_y_fecha():
    meta = get_taxonomy_meta()
    assert re.fullmatch(r"\d{4}-\d{2}\.\d+", meta["version"])
    assert meta["modelo_referencia"] == "claude-sonnet-4.6"
    assert meta["fecha_evaluacion"] == "2026-04-29"


def test_dias_desde_evaluacion_con_fecha_inyectada():
    evaluada = date.fromisoformat(get_taxonomy_meta()["fecha_evaluacion"])
    assert dias_desde_evaluacion(hoy=evaluada + timedelta(days=10)) == 10


def test_revision_recomendada_segun_umbral_trimestral():
    evaluada = date.fromisoformat(get_taxonomy_meta()["fecha_evaluacion"])
    fresca = build_capability_frontier_info(hoy=evaluada + timedelta(days=10))
    vencida = build_capability_frontier_info(hoy=evaluada + timedelta(days=REVISION_DIAS))
    assert fresca["revision_recomendada"] is False
    assert vencida["revision_recomendada"] is True


def test_capability_frontier_conteos_por_nivel():
    info = build_capability_frontier_info()
    counts = info["skills_por_nivel"]
    assert set(counts) == {"automated", "augmented", "resilient"}
    assert all(n > 0 for n in counts.values())
    assert info["total_skills"] == sum(counts.values())
    assert info["historial"], "el historial debe registrar al menos la versión inicial"
