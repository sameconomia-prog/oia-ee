import json
import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from pipeline.db.models import Base, Vacante, Carrera
from pipeline.skill_graph.builder import build_skill_graph


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _add_vacante(db, skills: list[str], fecha_pub=None, sector="tecnología"):
    v = Vacante(
        titulo="Analista",
        sector=sector,
        skills=json.dumps(skills),
        fecha_pub=fecha_pub or date.today(),
        fuente="occ",
    )
    db.add(v)
    db.flush()
    return v


def _add_carrera(db, nombre="Ingeniería en Sistemas", area="Ingeniería y Tecnología"):
    c = Carrera(nombre_norm=nombre, area_conocimiento=area)
    db.add(c)
    db.flush()
    return c


def test_build_skill_graph_retorna_estructura_correcta(db):
    carrera = _add_carrera(db)
    _add_vacante(db, ["python", "sql", "liderazgo"])
    result = build_skill_graph(carrera.id, db, top_n=10)
    assert "carrera_id" in result
    assert "skills" in result
    assert "pct_en_transicion" in result
    assert isinstance(result["skills"], list)


def test_build_skill_graph_skills_tienen_campos_requeridos(db):
    carrera = _add_carrera(db)
    _add_vacante(db, ["python", "facturación"])
    result = build_skill_graph(carrera.id, db)
    for skill in result["skills"]:
        assert "name" in skill
        assert "weight" in skill
        assert "ia_score" in skill
        assert "ia_label" in skill
        assert "trend_12m" in skill
        assert 0.0 <= skill["weight"] <= 1.0
        assert skill["ia_label"] in ("automated", "augmented", "resilient", "unknown")


def test_build_skill_graph_sin_vacantes_retorna_lista_vacia(db):
    carrera = _add_carrera(db)
    result = build_skill_graph(carrera.id, db)
    assert result["skills"] == []
    assert result["pct_en_transicion"] == 0.0


def test_build_skill_graph_respeta_top_n(db):
    carrera = _add_carrera(db)
    skills_100 = [f"skill_{i}" for i in range(100)]
    _add_vacante(db, skills_100)
    result = build_skill_graph(carrera.id, db, top_n=5)
    assert len(result["skills"]) <= 5


def test_pct_en_transicion_solo_cuenta_automated_y_augmented(db):
    carrera = _add_carrera(db)
    _add_vacante(db, ["facturación", "captura de datos", "python", "liderazgo"])
    result = build_skill_graph(carrera.id, db)
    automated_aug = [s for s in result["skills"] if s["ia_label"] in ("automated", "augmented")]
    total = len(result["skills"])
    if total > 0:
        expected_pct = round(len(automated_aug) / total, 2)
        assert result["pct_en_transicion"] == pytest.approx(expected_pct, abs=0.01)


def test_carrera_inexistente_retorna_sin_nombre(db):
    result = build_skill_graph("no-existe", db)
    assert result["carrera_nombre"] is None
    assert result["skills"] == []
