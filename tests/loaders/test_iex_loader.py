# tests/loaders/test_iex_loader.py
import json
import sqlite3

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pipeline.db.models import Base, Carrera
from pipeline.db.models_iex import CarreraSocMap, ContextoOcupacionMX, ExposicionIEX
from pipeline.loaders.iex_loader import (
    IexDatasetError,
    fetch_iex_records,
    load_contexto_mx,
    load_exposicion_iex,
    resolve_data_dir,
    seed_carrera_soc_map,
)

IEX_CSV = """soc_code,iex,n_tareas,tipo,titulo_es,cuadrante_esperado,elasticidad_esperada
15-1252,6.5,17.0,B,Desarrolladores de software,IEI_alto,E-Alta
43-3031,8.462,28.0,A,Auxiliares contables,IEI_alto,E-Baja
"""

BASELINE_CSV = """soc_code,beta_ponderada,uso_aei_total_pct
15-1252,0.8968,3.0042
43-3031,0.7861,0.1607
"""

ELASTICIDAD_CSV = """soc_code,elasticidad_mx
15-1252,E-Alta
43-3031,E-Baja
"""

DIMENSIONES_CSV = """soc_code,dim_d1,dim_d2,dim_d3,dim_d4,dim_d5,dim_d6,dim_d7,n_tareas
15-1252,9.1,7.2,6.8,7.5,6.0,7.9,5.3,17
43-3031,8.3,6.9,7.7,7.8,5.2,7.1,7.9,28
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
    """Réplica mínima de la estructura del repo oia-ee-research."""
    (tmp_path / "outputs").mkdir()
    (tmp_path / "docs").mkdir()
    (tmp_path / "db").mkdir()
    (tmp_path / "outputs" / "iex_ocupacion.csv").write_text(IEX_CSV)
    (tmp_path / "outputs" / "exposicion_baseline.csv").write_text(BASELINE_CSV)
    (tmp_path / "outputs" / "iex_dimensiones_ocupacion.csv").write_text(DIMENSIONES_CSV)
    (tmp_path / "docs" / "elasticidad_mx.csv").write_text(ELASTICIDAD_CSV)
    con = sqlite3.connect(tmp_path / "db" / "tesis.db")
    con.execute(
        "CREATE TABLE iex_ocupacion_v2 (soc_code TEXT, iex_v2 REAL, tipo_v2 TEXT)")
    con.executemany(
        "INSERT INTO iex_ocupacion_v2 VALUES (?, ?, ?)",
        [("15-1252", 5.769, "B"), ("43-3031", 7.98, "A")],
    )
    con.execute(
        "CREATE TABLE ocupaciones_mx (soc_code TEXT, empleo_mx INTEGER, "
        "ingreso_mensual_mediano_mxn REAL, pct_informalidad REAL, pct_mujeres REAL, "
        "edad_mediana REAL, escolaridad_media_anios REAL, "
        "pct_rural_loc_menor_15k REAL, top3_entidades TEXT)")
    con.execute(
        "INSERT INTO ocupaciones_mx VALUES "
        "('15-1252', 400078, 20000.0, 14.6, 17.9, 33.0, 16.5, 9.4, 'CDMX, Edomex, Jalisco')")
    con.commit()
    con.close()
    return str(tmp_path)


def test_fetch_fusiona_las_cuatro_fuentes(data_dir):
    records = {r["soc_code"]: r for r in fetch_iex_records(data_dir)}
    assert set(records) == {"15-1252", "43-3031"}
    dev = records["15-1252"]
    assert dev["iex_v1"] == pytest.approx(6.5)
    assert dev["iex_v2"] == pytest.approx(5.769)
    assert dev["tipo"] == "B"
    assert dev["elasticidad_mx"] == "E-Alta"
    assert dev["beta_eloundou"] == pytest.approx(0.8968)
    assert dev["uso_aei_pct"] == pytest.approx(3.0042)
    assert dev["fecha_dataset"] is not None
    assert dev["dim_d7"] == pytest.approx(5.3)   # TRC del panel = D7 del IEX
    assert dev["dim_d1"] == pytest.approx(9.1)


def test_fetch_sin_dimensiones_carga_con_nulls(data_dir, tmp_path):
    """El CSV de dimensiones es opcional: sin él, dims quedan None."""
    (tmp_path / "outputs" / "iex_dimensiones_ocupacion.csv").unlink()
    records = {r["soc_code"]: r for r in fetch_iex_records(data_dir)}
    assert records["15-1252"]["dim_d7"] is None
    assert records["15-1252"]["iex_v1"] == pytest.approx(6.5)


def test_fetch_columna_faltante_lanza_error(data_dir, tmp_path):
    (tmp_path / "docs" / "elasticidad_mx.csv").write_text("soc_code,otra\n15-1252,x\n")
    with pytest.raises(IexDatasetError, match="elasticidad_mx"):
        fetch_iex_records(data_dir)


def test_fetch_elasticidad_invalida_lanza_error(data_dir, tmp_path):
    (tmp_path / "docs" / "elasticidad_mx.csv").write_text(
        "soc_code,elasticidad_mx\n15-1252,E-Altísima\n")
    with pytest.raises(IexDatasetError, match="inválidos"):
        fetch_iex_records(data_dir)


def test_fetch_iex_fuera_de_rango_lanza_error(data_dir, tmp_path):
    (tmp_path / "outputs" / "iex_ocupacion.csv").write_text(
        "soc_code,iex,titulo_es\n15-1252,11.5,Dev\n")
    with pytest.raises(IexDatasetError, match="rango"):
        fetch_iex_records(data_dir)


def test_fetch_sin_tesis_db_lanza_error(data_dir, tmp_path):
    (tmp_path / "db" / "tesis.db").unlink()
    with pytest.raises(IexDatasetError, match="tesis.db"):
        fetch_iex_records(data_dir)


def test_data_dir_inexistente_lanza_error():
    with pytest.raises(IexDatasetError, match="no existe"):
        fetch_iex_records("/ruta/que/no/existe")


def test_resolve_data_dir_lee_env_var(data_dir, monkeypatch):
    monkeypatch.setenv("IEX_DATA_DIR", data_dir)
    assert str(resolve_data_dir(None)) == data_dir


def test_load_es_idempotente(session, data_dir):
    r1 = load_exposicion_iex(session, data_dir=data_dir)
    assert r1 == {"procesados": 2, "insertados": 2, "actualizados": 0}
    r2 = load_exposicion_iex(session, data_dir=data_dir)
    assert r2 == {"procesados": 2, "insertados": 0, "actualizados": 2}
    assert session.query(ExposicionIEX).count() == 2


def test_load_actualiza_valores_en_segunda_corrida(session, data_dir, tmp_path):
    load_exposicion_iex(session, data_dir=data_dir)
    (tmp_path / "outputs" / "iex_ocupacion.csv").write_text(
        IEX_CSV.replace("6.5", "7.1"))
    load_exposicion_iex(session, data_dir=data_dir)
    row = session.get(ExposicionIEX, "15-1252")
    assert row.iex_v1 == pytest.approx(7.1)


def test_seed_crosswalk_trunca_onet_a_soc(session, data_dir):
    load_exposicion_iex(session, data_dir=data_dir)
    c = Carrera(nombre_norm="ing sistemas",
                onet_codes_relacionados=json.dumps(["15-1252.00"]))
    sin_match = Carrera(nombre_norm="filosofía",
                        onet_codes_relacionados=json.dumps(["99-9999.00"]))
    session.add_all([c, sin_match])
    session.flush()

    result = seed_carrera_soc_map(session)
    assert result == {"carreras_mapeadas": 1, "insertados": 1}
    mapeo = session.query(CarreraSocMap).filter_by(carrera_id=c.id).one()
    assert mapeo.soc_code == "15-1252"
    assert mapeo.es_aproximacion is True

    # Idempotente: re-seed no duplica
    result2 = seed_carrera_soc_map(session)
    assert result2["insertados"] == 0
    assert session.query(CarreraSocMap).count() == 1


def test_load_contexto_mx_carga_e_idempotente(session, data_dir):
    r1 = load_contexto_mx(session, data_dir=data_dir)
    assert r1 == {"contexto_procesados": 1}
    row = session.get(ContextoOcupacionMX, "15-1252")
    assert row.empleo_mx == 400078
    assert row.pct_mujeres == pytest.approx(17.9)
    load_contexto_mx(session, data_dir=data_dir)
    assert session.query(ContextoOcupacionMX).count() == 1


def test_load_contexto_mx_sin_tabla_no_truena(session, tmp_path):
    import sqlite3 as _sq
    (tmp_path / "db").mkdir()
    _sq.connect(tmp_path / "db" / "tesis.db").close()
    r = load_contexto_mx(session, data_dir=str(tmp_path))
    assert r == {"contexto_procesados": 0}


def test_seed_crosswalk_no_pisa_ediciones_manuales(session, data_dir):
    load_exposicion_iex(session, data_dir=data_dir)
    c = Carrera(nombre_norm="contaduría",
                onet_codes_relacionados=json.dumps(["43-3031.00"]))
    session.add(c)
    session.flush()
    session.add(CarreraSocMap(carrera_id=c.id, soc_code="43-3031", peso=0.7,
                              es_aproximacion=False, fuente="superadmin"))
    session.flush()

    seed_carrera_soc_map(session)
    mapeo = session.query(CarreraSocMap).filter_by(carrera_id=c.id).one()
    assert mapeo.peso == pytest.approx(0.7)
    assert mapeo.es_aproximacion is False
    assert mapeo.fuente == "superadmin"
