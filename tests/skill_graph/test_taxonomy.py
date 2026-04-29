from pipeline.skill_graph.taxonomy import get_ia_label, get_ia_score


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
