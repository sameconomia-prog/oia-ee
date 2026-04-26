import pytest
from pipeline.predictor.skills_aggregator import aggregate_skills_from_vacantes
from pipeline.db.models import Vacante
from pipeline.db.models_radar import SkillEmergente
from datetime import date


def test_aggregate_skills_counts_mentions(session):
    session.add_all([
        Vacante(titulo="Dev A", skills="Python, SQL, Machine Learning", fecha_pub=date.today()),
        Vacante(titulo="Dev B", skills="Python, Docker, Kubernetes", fecha_pub=date.today()),
        Vacante(titulo="Dev C", skills="SQL, FastAPI, Python", fecha_pub=date.today()),
    ])
    session.flush()

    count = aggregate_skills_from_vacantes(db=session)

    assert count > 0
    python_sk = session.query(SkillEmergente).filter_by(skill="Python").first()
    assert python_sk is not None
    assert python_sk.menciones_30d >= 3


def test_aggregate_skills_updates_existing(session):
    existing = SkillEmergente(skill="SQL", categoria="tecnica", menciones_30d=10)
    session.add(existing)
    session.flush()

    session.add(Vacante(titulo="Analista", skills="SQL, Excel", fecha_pub=date.today()))
    session.flush()

    aggregate_skills_from_vacantes(db=session)

    skills = session.query(SkillEmergente).filter_by(skill="SQL").all()
    assert len(skills) == 1  # no duplicar
    assert skills[0].menciones_30d >= 1
