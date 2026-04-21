import pytest
from pathlib import Path
from pipeline.loaders.stps_loader import StpsLoader, StpsVacante

CSV_PATH = Path(__file__).parent / "fixtures" / "stps_sample.csv"

def test_load_csv_returns_vacantes():
    loader = StpsLoader()
    vacantes = loader.load_csv(CSV_PATH)
    assert len(vacantes) == 3
    assert all(isinstance(v, StpsVacante) for v in vacantes)

def test_primera_vacante_correcta():
    loader = StpsLoader()
    vacantes = loader.load_csv(CSV_PATH)
    v = vacantes[0]
    assert v.titulo == "Ingeniero de Software IA"
    assert v.empresa == "TechCorp"
    assert "Python" in v.skills
    assert v.salario_min == 25000

def test_skills_son_lista():
    loader = StpsLoader()
    vacantes = loader.load_csv(CSV_PATH)
    assert isinstance(vacantes[0].skills, list)
    assert len(vacantes[0].skills) == 3
