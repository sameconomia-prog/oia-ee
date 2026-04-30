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
