import pytest
from pathlib import Path
from pipeline.loaders.anuies_loader import AnuiesLoader, AnuiesRecord

CSV_PATH = Path(__file__).parent / "fixtures" / "anuies_sample.csv"

def test_load_returns_records():
    loader = AnuiesLoader()
    records = loader.load_csv(CSV_PATH)
    assert len(records) == 3
    assert all(isinstance(r, AnuiesRecord) for r in records)

def test_ies_fields():
    loader = AnuiesLoader()
    records = loader.load_csv(CSV_PATH)
    r = records[0]
    assert r.clave_sep == "UVM001"
    assert r.nombre_ies == "Universidad del Valle de México"
    assert r.tipo == "privada"
    assert r.estado == "Ciudad de México"

def test_carrera_fields():
    loader = AnuiesLoader()
    records = loader.load_csv(CSV_PATH)
    r = records[0]
    assert r.nombre_carrera == "Ingeniería en Sistemas"
    assert r.nivel == "licenciatura"
    assert r.matricula == 1200
    assert r.egresados == 180
    assert r.ciclo == "2024/2"
