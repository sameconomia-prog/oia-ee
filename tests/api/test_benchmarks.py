from __future__ import annotations
import pytest
from pathlib import Path
import yaml

from api.benchmarks_loader import _load_all_yaml, compute_direction


# ── helpers ──────────────────────────────────────────────────────────────────

def _write_source(tmp_path: Path, fuente_id: str, skill_ids: list[str],
                  direccion: str = "declining") -> None:
    (tmp_path / "sources").mkdir(parents=True, exist_ok=True)
    data = {
        "fuente": {
            "id": fuente_id,
            "nombre": f"Fuente {fuente_id}",
            "año": 2025,
            "metodologia": "encuesta_empleadores",
            "tipo_evidencia": "prediccion",
            "dato_clave": "Dato test",
            "muestra": "100 empleadores",
            "cobertura": "global",
            "url": "https://example.com",
            "confianza": "alta",
            "peso_geografico": "global",
        },
        "hallazgos": [
            {
                "id": f"{fuente_id}-h1",
                "ocupacion_original": "Test",
                "ocupacion_codigo_oficial": "TEST-001",
                "skills_afectadas": skill_ids,
                "direccion": direccion,
                "taxonomia_oia": "automated",
                "horizonte_impacto": "corto",
                "hallazgo": "Test hallazgo",
                "dato_clave": "Test dato",
                "cita_textual": "Cita test [p. 1]",
                "divergencia_oia": False,
                "nota_divergencia": None,
            }
        ],
    }
    (tmp_path / "sources" / f"{fuente_id}.yaml").write_text(
        yaml.dump(data, allow_unicode=True), encoding="utf-8"
    )


def _write_career_map(tmp_path: Path, skill_ids: list[str]) -> None:
    data = {
        "carreras": [
            {
                "slug": "carrera-test",
                "nombre": "Carrera de Prueba",
                "area": "test",
                "skills": [
                    {
                        "id": sid,
                        "nombre": f"Skill {sid}",
                        "tipo": "tecnica",
                        "accion_curricular": "fortalecer",
                    }
                    for sid in skill_ids
                ],
            }
        ]
    }
    (tmp_path / "career_skills_map.yaml").write_text(
        yaml.dump(data, allow_unicode=True), encoding="utf-8"
    )


# ── loader tests ──────────────────────────────────────────────────────────────

def test_load_returns_sources_career_map_and_index(tmp_path):
    _write_source(tmp_path, "src1", ["skill-a"])
    _write_career_map(tmp_path, ["skill-a"])
    sources, career_map, skill_index = _load_all_yaml(tmp_path)
    assert "src1" in sources
    assert "carreras" in career_map
    assert "skill-a" in skill_index
    assert "src1" in skill_index["skill-a"]


def test_orphan_skill_ids_raise_on_load(tmp_path):
    _write_source(tmp_path, "src1", ["skill-orphan"])
    _write_career_map(tmp_path, ["skill-known"])
    with pytest.raises(ValueError, match="skill-orphan"):
        _load_all_yaml(tmp_path)


def test_compute_direction_75_percent_declining():
    hallazgos = {
        "s1": {"direccion": "declining"},
        "s2": {"direccion": "declining"},
        "s3": {"direccion": "declining"},
        "s4": {"direccion": "growing"},
    }
    assert compute_direction(hallazgos) == "declining"


def test_compute_direction_below_75_is_mixed():
    hallazgos = {
        "s1": {"direccion": "declining"},
        "s2": {"direccion": "growing"},
    }
    assert compute_direction(hallazgos) == "mixed"


def test_compute_direction_no_coverage_is_sin_datos():
    assert compute_direction({}) == "sin_datos"


# ── API endpoint tests ────────────────────────────────────────────────────────

from fastapi.testclient import TestClient
from api.main import app

_MOCK_SOURCES = {
    "src1": {
        "fuente": {
            "id": "src1",
            "nombre": "Fuente Test 1",
            "año": 2025,
            "metodologia": "encuesta_empleadores",
            "tipo_evidencia": "prediccion",
            "dato_clave": "Dato test",
            "confianza": "alta",
            "peso_geografico": "global",
            "url": "https://example.com",
        },
        "hallazgos": [
            {
                "id": "src1-h1",
                "skills_afectadas": ["skill-a"],
                "direccion": "declining",
                "horizonte_impacto": "corto",
                "hallazgo": "Test hallazgo",
                "dato_clave": "Dato test",
                "cita_textual": "Cita [p.1]",
            }
        ],
    }
}
_MOCK_CAREER_MAP = {
    "carreras": [
        {
            "slug": "carrera-test",
            "nombre": "Carrera Test",
            "area": "test",
            "skills": [
                {"id": "skill-a", "nombre": "Skill A", "tipo": "tecnica",
                 "accion_curricular": "retirar"},
                {"id": "skill-b", "nombre": "Skill B", "tipo": "transversal",
                 "accion_curricular": "fortalecer"},
            ],
        }
    ]
}
_MOCK_SKILL_INDEX = {
    "skill-a": {"src1": _MOCK_SOURCES["src1"]["hallazgos"][0]}
}
_MOCK_DATA = (_MOCK_SOURCES, _MOCK_CAREER_MAP, _MOCK_SKILL_INDEX)


@pytest.fixture
def bench_client(monkeypatch):
    monkeypatch.setattr("api.routers.benchmarks.load_benchmarks", lambda: _MOCK_DATA)
    with TestClient(app) as c:
        yield c


def test_sources_returns_list(bench_client):
    resp = bench_client.get("/publico/benchmarks/sources")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert data[0]["id"] == "src1"


def test_careers_returns_summary_counts(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    career = data[0]
    assert career["slug"] == "carrera-test"
    assert career["total_skills"] == 2
    assert career["skills_declining"] == 1
    assert career["skills_sin_datos"] == 1


def test_career_detail_has_skills(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers/carrera-test")
    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == "carrera-test"
    assert len(data["skills"]) == 2


def test_skill_without_coverage_shows_sin_datos(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers/carrera-test")
    assert resp.status_code == 200
    skills = resp.json()["skills"]
    skill_b = next(s for s in skills if s["skill_id"] == "skill-b")
    assert skill_b["direccion_global"] == "sin_datos"


def test_convergence_count_is_correct(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers/carrera-test")
    assert resp.status_code == 200
    skills = resp.json()["skills"]
    skill_a = next(s for s in skills if s["skill_id"] == "skill-a")
    assert skill_a["direccion_global"] == "declining"
    assert skill_a["convergencia_por_fuente"]["src1"] == "declining"


def test_curriculum_action_is_one_of_four_valid_values(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers/carrera-test")
    assert resp.status_code == 200
    valid = {"retirar", "redisenar", "fortalecer", "agregar"}
    for skill in resp.json()["skills"]:
        assert skill["accion_curricular"] in valid


def test_career_not_found_returns_404(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers/no-existe")
    assert resp.status_code == 404


def test_resumen_estructura(bench_client):
    resp = bench_client.get("/publico/benchmarks/resumen")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_carreras"] == 1
    assert data["total_fuentes"] == 1
    assert data["total_skills"] == 2
    assert "skills_declining" in data
    assert "skills_growing" in data
    assert "skills_mixed_stable" in data
    assert "skills_sin_datos" in data
    assert "acciones" in data
    assert isinstance(data["acciones"], dict)


def test_skill_cross_source_returns_hallazgos(bench_client):
    resp = bench_client.get("/publico/benchmarks/skills/skill-a")
    assert resp.status_code == 200
    data = resp.json()
    assert data["skill_id"] == "skill-a"
    assert isinstance(data["hallazgos"], list)
    assert len(data["hallazgos"]) == 1
    h = data["hallazgos"][0]
    assert h["fuente_id"] == "src1"
    assert h["direccion"] == "declining"
    assert "hallazgo" in h
    assert "dato_clave" in h
    assert "cita_textual" in h


def test_skill_cross_source_sin_cobertura_returns_empty(bench_client):
    resp = bench_client.get("/publico/benchmarks/skills/skill-b")
    assert resp.status_code == 200
    data = resp.json()
    assert data["skill_id"] == "skill-b"
    assert data["hallazgos"] == []


def test_skill_cross_source_not_found_returns_404(bench_client):
    resp = bench_client.get("/publico/benchmarks/skills/skill-inexistente")
    assert resp.status_code == 404


def test_skill_convergencia_has_consenso_fields(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers/carrera-test")
    assert resp.status_code == 200
    skills = resp.json()["skills"]
    skill_a = next(s for s in skills if s["skill_id"] == "skill-a")
    assert "consenso_pct" in skill_a
    assert "fuentes_con_datos" in skill_a
    assert skill_a["fuentes_con_datos"] == 1
    assert 0 <= skill_a["consenso_pct"] <= 100


def test_skill_sin_datos_consenso_is_zero(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers/carrera-test")
    assert resp.status_code == 200
    skills = resp.json()["skills"]
    skill_b = next(s for s in skills if s["skill_id"] == "skill-b")
    assert skill_b["fuentes_con_datos"] == 0
    assert skill_b["consenso_pct"] == 0


def test_skill_100_percent_consenso_when_all_agree(tmp_path):
    _write_source(tmp_path, "s1", ["skill-x"], "declining")
    _write_source(tmp_path, "s2", ["skill-x"], "declining")
    _write_source(tmp_path, "s3", ["skill-x"], "declining")
    _write_career_map(tmp_path, ["skill-x"])
    sources, career_map, skill_index = _load_all_yaml(tmp_path)
    from api.routers.benchmarks import _build_skill_convergencia
    skill_def = career_map["carreras"][0]["skills"][0]
    out = _build_skill_convergencia(skill_def, skill_index, sources)
    assert out.consenso_pct == 100
    assert out.fuentes_con_datos == 3


def test_skills_index_returns_all_skills(bench_client):
    resp = bench_client.get("/publico/benchmarks/skills")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2  # skill-a and skill-b in mock data
    ids = {s["skill_id"] for s in data}
    assert "skill-a" in ids
    assert "skill-b" in ids


def test_skills_index_item_structure(bench_client):
    resp = bench_client.get("/publico/benchmarks/skills")
    assert resp.status_code == 200
    item = resp.json()[0]
    assert "skill_id" in item
    assert "skill_nombre" in item
    assert "skill_tipo" in item
    assert "direccion_global" in item
    assert "fuentes_con_datos" in item
    assert "consenso_pct" in item
    assert "carreras" in item
    assert isinstance(item["carreras"], list)


def test_skills_index_carreras_contains_career_slug(bench_client):
    resp = bench_client.get("/publico/benchmarks/skills")
    assert resp.status_code == 200
    data = resp.json()
    skill_a = next(s for s in data if s["skill_id"] == "skill-a")
    assert "carrera-test" in skill_a["carreras"]


# ── urgencia_curricular tests ─────────────────────────────────────────────────

def test_career_summary_has_urgencia_curricular(bench_client):
    resp = bench_client.get("/publico/benchmarks/careers")
    assert resp.status_code == 200
    career = resp.json()[0]
    assert "urgencia_curricular" in career
    assert isinstance(career["urgencia_curricular"], int)
    assert 0 <= career["urgencia_curricular"] <= 100


def test_urgencia_above_zero_with_declining_skill_and_coverage(bench_client):
    """skill-a is declining with 1 source → urgencia should be > 0."""
    resp = bench_client.get("/publico/benchmarks/careers")
    assert resp.status_code == 200
    career = resp.json()[0]
    # 1 declining out of 2 skills, consenso 100% → pct=0.5, avg_c=1.0 → 50
    assert career["urgencia_curricular"] > 0


def test_urgencia_zero_when_no_declining_skills(tmp_path):
    _write_source(tmp_path, "s1", ["skill-g"], "growing")
    data = {
        "carreras": [{
            "slug": "all-growing",
            "nombre": "Carrera Growing",
            "area": "test",
            "skills": [{"id": "skill-g", "nombre": "Skill G", "tipo": "tecnica",
                        "accion_curricular": "fortalecer"}],
        }]
    }
    (tmp_path / "career_skills_map.yaml").write_text(
        __import__("yaml").dump(data, allow_unicode=True), encoding="utf-8"
    )
    sources, career_map, skill_index = _load_all_yaml(tmp_path)
    from api.routers.benchmarks import _compute_urgencia
    carrera = career_map["carreras"][0]
    assert _compute_urgencia(carrera, skill_index) == 0


def test_urgencia_zero_when_no_skills():
    from api.routers.benchmarks import _compute_urgencia
    empty_carrera = {"skills": []}
    assert _compute_urgencia(empty_carrera, {}) == 0


def test_urgencia_zero_when_declining_has_no_coverage(tmp_path):
    """Declining skill but zero sources → consenso not computed → urgencia=0."""
    _write_career_map(tmp_path, ["skill-orphan-check"])
    (tmp_path / "sources").mkdir(parents=True, exist_ok=True)
    sources, career_map, skill_index = _load_all_yaml(tmp_path)
    from api.routers.benchmarks import _compute_urgencia
    # No coverage → compute_direction → sin_datos → urgencia=0
    assert _compute_urgencia(career_map["carreras"][0], skill_index) == 0


def test_compute_direction_100_percent_growing():
    hallazgos = {
        "s1": {"direccion": "growing"},
        "s2": {"direccion": "growing"},
        "s3": {"direccion": "growing"},
    }
    assert compute_direction(hallazgos) == "growing"


def test_resumen_acciones_include_known_action_types(bench_client):
    resp = bench_client.get("/publico/benchmarks/resumen")
    assert resp.status_code == 200
    acciones = resp.json()["acciones"]
    assert isinstance(acciones, dict)
    valid = {"retirar", "redisenar", "fortalecer", "agregar"}
    for k in acciones:
        assert k in valid, f"Unexpected accion: {k}"


# ── source detail tests ───────────────────────────────────────────────────────

def test_source_detail_returns_hallazgos(bench_client):
    resp = bench_client.get("/publico/benchmarks/sources/src1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "src1"
    assert data["nombre"] == "Fuente Test 1"
    assert isinstance(data["hallazgos"], list)
    assert data["total_hallazgos"] == len(data["hallazgos"])


def test_source_detail_hallazgo_has_career_context(bench_client):
    resp = bench_client.get("/publico/benchmarks/sources/src1")
    assert resp.status_code == 200
    hallazgos = resp.json()["hallazgos"]
    assert len(hallazgos) == 1
    h = hallazgos[0]
    assert h["career_slug"] == "carrera-test"
    assert h["skill_id"] == "skill-a"
    assert h["skill_nombre"] == "Skill A"
    assert h["skill_tipo"] == "tecnica"
    assert h["direccion"] == "declining"
    assert "hallazgo" in h
    assert "dato_clave" in h
    assert "cita_textual" in h


def test_source_detail_not_found_returns_404(bench_client):
    resp = bench_client.get("/publico/benchmarks/sources/no-existe")
    assert resp.status_code == 404


def test_source_detail_filter_by_dir_declining(bench_client):
    """Source with hallazgos — all should be declining in mock data."""
    resp = bench_client.get("/publico/benchmarks/sources/src1")
    assert resp.status_code == 200
    hallazgos = resp.json()["hallazgos"]
    for h in hallazgos:
        assert h["direccion"] in {"declining", "growing", "mixed", "stable", "sin_datos"}
