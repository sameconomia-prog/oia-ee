from datetime import date
from pipeline.db.models_predictor import PrediccionKpi


def test_prediccion_kpi_crea_con_campos_minimos(session):
    pred = PrediccionKpi(
        entidad_tipo="carrera",
        entidad_id="carrera-abc-123",
        kpi_nombre="D1",
        horizonte_años=3,
        fecha_prediccion=date(2028, 1, 1),
        valor_predicho=0.72,
        ci_80_lower=0.65,
        ci_80_upper=0.79,
        ci_95_lower=0.61,
        ci_95_upper=0.83,
        modelo_version="AutoETS-v1",
    )
    session.add(pred)
    session.flush()
    assert pred.id is not None
    assert pred.fecha_generacion is not None


def test_prediccion_kpi_indice_entidad(session):
    pred = PrediccionKpi(
        entidad_tipo="carrera",
        entidad_id="xyz-999",
        kpi_nombre="D2",
        horizonte_años=1,
        fecha_prediccion=date(2027, 1, 1),
        valor_predicho=0.55,
        ci_80_lower=0.48,
        ci_80_upper=0.62,
        ci_95_lower=0.44,
        ci_95_upper=0.66,
        modelo_version="AutoETS-v1",
    )
    session.add(pred)
    session.flush()
    found = (
        session.query(PrediccionKpi)
        .filter_by(entidad_id="xyz-999", kpi_nombre="D2")
        .first()
    )
    assert found is not None
    assert found.valor_predicho == 0.55
