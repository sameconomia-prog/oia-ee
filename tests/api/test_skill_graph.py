import json
import pytest
from datetime import date
from pipeline.db.models import Vacante, Carrera


def _add_carrera(db, nombre="Ingeniería en Sistemas", area="Ingeniería y Tecnología"):
    c = Carrera(nombre_norm=nombre, area_conocimiento=area)
    db.add(c)
    db.flush()
    return c


def _add_vacante(db, skills: list[str]):
    v = Vacante(
        titulo="Analista",
        sector="tecnología",
        skills=json.dumps(skills),
        fecha_pub=date.today(),
        fuente="occ",
    )
    db.add(v)
    db.flush()
    return v


def test_skill_graph_retorna_200_con_datos(client, db_session):
    carrera = _add_carrera(db_session)
    _add_vacante(db_session, ["python", "sql", "liderazgo"])
    resp = client.get(f"/carreras/{carrera.id}/skill-graph")
    assert resp.status_code == 200
    data = resp.json()
    assert data["carrera_id"] == str(carrera.id)
    assert data["carrera_nombre"] == "Ingeniería en Sistemas"
    assert isinstance(data["skills"], list)
    assert "pct_en_transicion" in data


def test_skill_graph_404_carrera_inexistente(client, db_session):
    resp = client.get("/carreras/no-existe/skill-graph")
    assert resp.status_code == 404


def test_skill_graph_estructura_skills(client, db_session):
    carrera = _add_carrera(db_session)
    _add_vacante(db_session, ["python", "facturación", "liderazgo"])
    resp = client.get(f"/carreras/{carrera.id}/skill-graph")
    assert resp.status_code == 200
    for skill in resp.json()["skills"]:
        assert "name" in skill
        assert "weight" in skill
        assert "ia_score" in skill
        assert "ia_label" in skill
        assert "trend_12m" in skill
        assert skill["ia_label"] in ("automated", "augmented", "resilient", "unknown")
        assert 0.0 <= skill["weight"] <= 1.0


def test_skill_graph_top_n_respetado(client, db_session):
    carrera = _add_carrera(db_session)
    _add_vacante(db_session, [f"skill_{i}" for i in range(30)])
    resp = client.get(f"/carreras/{carrera.id}/skill-graph?top_n=5")
    assert resp.status_code == 200
    assert len(resp.json()["skills"]) <= 5


def test_skill_graph_top_n_minimo(client, db_session):
    carrera = _add_carrera(db_session)
    resp = client.get(f"/carreras/{carrera.id}/skill-graph?top_n=4")
    assert resp.status_code == 422


def test_skill_graph_top_n_maximo(client, db_session):
    carrera = _add_carrera(db_session)
    resp = client.get(f"/carreras/{carrera.id}/skill-graph?top_n=51")
    assert resp.status_code == 422


def test_skill_graph_sin_vacantes_retorna_lista_vacia(client, db_session):
    carrera = _add_carrera(db_session)
    resp = client.get(f"/carreras/{carrera.id}/skill-graph")
    assert resp.status_code == 200
    data = resp.json()
    assert data["skills"] == []
    assert data["pct_en_transicion"] == 0.0


# --- Tests endpoint global ---

def test_global_skill_graph_retorna_200(client, db_session):
    _add_vacante(db_session, ["python", "excel", "liderazgo"])
    resp = client.get("/skills/global")
    assert resp.status_code == 200
    data = resp.json()
    assert "skills" in data
    assert "pct_en_transicion" in data
    assert "skill_count" in data


def test_global_skill_graph_estructura(client, db_session):
    _add_vacante(db_session, ["python", "sql"])
    resp = client.get("/skills/global")
    assert resp.status_code == 200
    for s in resp.json()["skills"]:
        assert "name" in s
        assert "weight" in s
        assert "ia_score" in s
        assert "ia_label" in s
        assert "trend_12m" in s


def test_global_skill_graph_sin_vacantes(client, db_session):
    resp = client.get("/skills/global")
    assert resp.status_code == 200
    data = resp.json()
    assert data["skills"] == []
    assert data["skill_count"] == 0


def test_global_skill_graph_top_n(client, db_session):
    for i in range(20):
        _add_vacante(db_session, [f"skill_{i}"])
    resp = client.get("/skills/global?top_n=10")
    assert resp.status_code == 200
    assert len(resp.json()["skills"]) <= 10


def test_global_skill_graph_top_n_minimo(client, db_session):
    resp = client.get("/skills/global?top_n=5")
    assert resp.status_code == 422
