from datetime import date
from pipeline.db.models_predictor import PrediccionKpi


def test_predicciones_carrera_empty_returns_ok(client):
    response = client.get("/predicciones/carrera/carrera-inexistente")
    assert response.status_code == 200
    data = response.json()
    assert "carrera_id" in data
    assert "predicciones" in data
    assert isinstance(data["predicciones"], dict)


def test_predicciones_carrera_returns_horizonte_data(client, db_session):
    pred = PrediccionKpi(
        entidad_tipo="carrera",
        entidad_id="carrera-test-999",
        kpi_nombre="D1",
        horizonte_años=3,
        fecha_prediccion=date(2028, 1, 1),
        valor_predicho=0.75,
        ci_80_lower=0.68,
        ci_80_upper=0.82,
        ci_95_lower=0.64,
        ci_95_upper=0.86,
        modelo_version="AutoETS-v1",
    )
    db_session.add(pred)
    db_session.commit()

    response = client.get("/predicciones/carrera/carrera-test-999?kpi=D1&horizonte=3")
    assert response.status_code == 200
    data = response.json()
    assert data["carrera_id"] == "carrera-test-999"
    assert "D1" in data["predicciones"]
    preds_d1 = data["predicciones"]["D1"]
    assert len(preds_d1) >= 1
    assert preds_d1[0]["valor_predicho"] == 0.75


def test_predicciones_semaforo_returns_colores(client, db_session):
    db_session.add_all([
        PrediccionKpi(entidad_tipo="carrera", entidad_id="sem-test", kpi_nombre="D1",
                      horizonte_años=1, fecha_prediccion=date(2027, 1, 1),
                      valor_predicho=0.45, ci_80_lower=0.40, ci_80_upper=0.50,
                      ci_95_lower=0.38, ci_95_upper=0.52, modelo_version="AutoETS-v1"),
        PrediccionKpi(entidad_tipo="carrera", entidad_id="sem-test", kpi_nombre="D1",
                      horizonte_años=3, fecha_prediccion=date(2029, 1, 1),
                      valor_predicho=0.72, ci_80_lower=0.65, ci_80_upper=0.79,
                      ci_95_lower=0.61, ci_95_upper=0.83, modelo_version="AutoETS-v1"),
        PrediccionKpi(entidad_tipo="carrera", entidad_id="sem-test", kpi_nombre="D1",
                      horizonte_años=5, fecha_prediccion=date(2031, 1, 1),
                      valor_predicho=0.88, ci_80_lower=0.82, ci_80_upper=0.94,
                      ci_95_lower=0.79, ci_95_upper=0.97, modelo_version="AutoETS-v1"),
    ])
    db_session.commit()

    response = client.get("/predicciones/carrera/sem-test/semaforo")
    assert response.status_code == 200
    data = response.json()
    assert data["1_año"]["color"] == "verde"
    assert data["3_años"]["color"] == "amarillo"
    assert data["5_años"]["color"] == "rojo"
