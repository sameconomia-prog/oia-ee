# tests/services/test_costo_ia.py
import json
import sqlite3

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pipeline.db.models import Base
from pipeline.db.models_iex import CostoIAOcupacion
from pipeline.services.costo_ia import calcular_costos_ia, costo_ia_hora_mxn


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


@pytest.fixture
def data_dir(tmp_path):
    (tmp_path / "db").mkdir()
    con = sqlite3.connect(tmp_path / "db" / "tesis.db")
    con.execute(
        "CREATE TABLE ocupaciones_mx (soc_code TEXT, ingreso_mensual_mediano_mxn REAL)")
    con.executemany(
        "INSERT INTO ocupaciones_mx VALUES (?, ?)",
        [("15-1252", 16000.0), ("43-3031", 8000.0), ("99-0000", None)],
    )
    con.commit()
    con.close()
    return str(tmp_path)


def test_costo_ia_hora_es_positivo(monkeypatch):
    monkeypatch.setenv("IEX_FX_MXN_USD", "18.5")
    # 0.2 MTok × $3 + 0.05 MTok × $15 = $1.35 USD → 24.975 MXN
    assert costo_ia_hora_mxn() == pytest.approx(24.975)


def test_calcular_costos_upsert_y_ratio(session, data_dir, monkeypatch):
    monkeypatch.setenv("IEX_FX_MXN_USD", "18.5")
    result = calcular_costos_ia(session, data_dir=data_dir)
    assert result["costos_procesados"] == 2   # el NULL se excluye

    row = session.get(CostoIAOcupacion, "15-1252")
    assert row.salario_hora_mxn == pytest.approx(100.0)   # 16000 / 160
    assert row.ratio_costo == pytest.approx(24.98 / 100.0, abs=0.01)
    assert row.modelo_ref == "claude-sonnet-4-6"
    assert "fx_mxn_usd" in json.loads(row.supuestos)

    # Idempotente: segunda corrida no duplica
    calcular_costos_ia(session, data_dir=data_dir)
    assert session.query(CostoIAOcupacion).count() == 2


def test_sin_tabla_ocupaciones_mx_no_truena(session, tmp_path):
    (tmp_path / "db").mkdir()
    sqlite3.connect(tmp_path / "db" / "tesis.db").close()
    result = calcular_costos_ia(session, data_dir=str(tmp_path))
    assert result["costos_procesados"] == 0
