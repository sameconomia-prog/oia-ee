# tests/jobs/test_iex_refresh_job.py
import json
import sqlite3

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pipeline.db.models import Base, Carrera
from pipeline.jobs.iex_refresh_job import run_iex_refresh

IEX_CSV = """soc_code,iex,titulo_es
15-1252,6.5,Desarrolladores de software
"""

BASELINE_CSV = """soc_code,beta_ponderada,uso_aei_total_pct
15-1252,0.8968,3.0042
"""

ELASTICIDAD_CSV = """soc_code,elasticidad_mx
15-1252,E-Alta
"""


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
    (tmp_path / "outputs").mkdir()
    (tmp_path / "docs").mkdir()
    (tmp_path / "db").mkdir()
    (tmp_path / "outputs" / "iex_ocupacion.csv").write_text(IEX_CSV)
    (tmp_path / "outputs" / "exposicion_baseline.csv").write_text(BASELINE_CSV)
    (tmp_path / "docs" / "elasticidad_mx.csv").write_text(ELASTICIDAD_CSV)
    con = sqlite3.connect(tmp_path / "db" / "tesis.db")
    con.execute("CREATE TABLE iex_ocupacion_v2 (soc_code TEXT, iex_v2 REAL, tipo_v2 TEXT)")
    con.execute("INSERT INTO iex_ocupacion_v2 VALUES ('15-1252', 5.769, 'B')")
    con.commit()
    con.close()
    return str(tmp_path)


def test_refresh_reporta_conteos_de_carga_y_crosswalk(session, data_dir):
    session.add(Carrera(nombre_norm="ing sistemas",
                        onet_codes_relacionados=json.dumps(["15-1252.00"])))
    session.flush()
    result = run_iex_refresh(session, data_dir=data_dir)
    assert result == {
        "procesados": 1,
        "insertados": 1,          # exposicion_iex — no pisado por el crosswalk
        "actualizados": 0,
        "crosswalk_carreras": 1,
        "crosswalk_insertados": 1,
        "fa_insertados": 13,       # seed completo de la propuesta
        "costos_procesados": 0,    # fixture sin tabla ocupaciones_mx
        "contexto_procesados": 0,  # ídem
    }


def test_refresh_es_idempotente(session, data_dir):
    run_iex_refresh(session, data_dir=data_dir)
    result = run_iex_refresh(session, data_dir=data_dir)
    assert result["insertados"] == 0
    assert result["actualizados"] == 1
    assert result["crosswalk_insertados"] == 0
