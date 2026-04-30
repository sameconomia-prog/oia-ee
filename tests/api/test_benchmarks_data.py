"""Tests de integridad sobre los archivos YAML reales de benchmarks.

Estos tests NO usan mocks — validan directamente los YAMLs en api/data/global_benchmarks/.
Sirven como red de seguridad ante cambios futuros en los archivos de datos.
"""
import pytest
from api.benchmarks_loader import _load_all_yaml


@pytest.fixture(scope="module")
def data():
    return _load_all_yaml()


def test_numero_fuentes(data):
    sources, _, _ = data
    assert len(sources) == 5, f"Se esperaban 5 fuentes, se encontraron {len(sources)}"


def test_ids_fuentes_esperados(data):
    sources, _, _ = data
    expected = {"wef2025", "anthropic2025", "mckinsey2023", "cepal2023", "freyosborne2013"}
    assert set(sources.keys()) == expected


def test_numero_carreras(data):
    _, career_map, _ = data
    carreras = career_map.get("carreras", [])
    assert len(carreras) == 14, f"Se esperaban 14 carreras, se encontraron {len(carreras)}"


def test_slugs_carreras_esperados(data):
    _, career_map, _ = data
    slugs = {c["slug"] for c in career_map["carreras"]}
    expected = {
        "contaduria", "diseno-grafico", "ingenieria-sistemas",
        "administracion-empresas", "medicina",
        "derecho", "psicologia", "mercadotecnia", "arquitectura", "enfermeria",
        "comunicacion", "economia", "educacion", "turismo",
    }
    assert slugs == expected


def test_todas_las_carreras_tienen_skills(data):
    _, career_map, _ = data
    for carrera in career_map["carreras"]:
        assert len(carrera.get("skills", [])) >= 4, (
            f"Carrera '{carrera['slug']}' tiene menos de 4 skills"
        )


def test_sin_skill_ids_huerfanos(data):
    sources, career_map, skill_index = data
    all_career_skill_ids = {
        s["id"] for c in career_map["carreras"] for s in c.get("skills", [])
    }
    orphans = set(skill_index.keys()) - all_career_skill_ids
    assert orphans == set(), f"Skill IDs huérfanos encontrados: {sorted(orphans)}"


def test_skills_con_cobertura_minima(data):
    _, _, skill_index = data
    assert len(skill_index) >= 15, (
        f"Se esperaban al menos 15 skills con cobertura, se encontraron {len(skill_index)}"
    )


def test_todas_las_fuentes_tienen_hallazgos(data):
    sources, _, _ = data
    for fuente_id, source_data in sources.items():
        hallazgos = source_data.get("hallazgos", [])
        assert len(hallazgos) >= 2, (
            f"Fuente '{fuente_id}' tiene menos de 2 hallazgos"
        )


def test_campos_requeridos_en_fuente(data):
    sources, _, _ = data
    required = {"id", "nombre", "año", "metodologia", "tipo_evidencia", "confianza"}
    for fuente_id, source_data in sources.items():
        fuente = source_data.get("fuente", {})
        for campo in required:
            assert campo in fuente, f"Fuente '{fuente_id}' le falta el campo '{campo}'"


def test_accion_curricular_valida(data):
    _, career_map, _ = data
    valid = {"retirar", "redisenar", "fortalecer", "agregar"}
    for carrera in career_map["carreras"]:
        for skill in carrera.get("skills", []):
            assert skill.get("accion_curricular") in valid, (
                f"Skill '{skill['id']}' en carrera '{carrera['slug']}' "
                f"tiene accion_curricular inválida: {skill.get('accion_curricular')}"
            )


def test_direccion_hallazgo_valida(data):
    sources, _, _ = data
    valid = {"declining", "growing", "stable", "mixed"}
    for fuente_id, source_data in sources.items():
        for hallazgo in source_data.get("hallazgos", []):
            assert hallazgo.get("direccion") in valid, (
                f"Hallazgo '{hallazgo.get('id')}' en fuente '{fuente_id}' "
                f"tiene dirección inválida: {hallazgo.get('direccion')}"
            )
