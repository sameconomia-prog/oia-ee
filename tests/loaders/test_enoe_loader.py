# tests/loaders/test_enoe_loader.py
import pytest
from unittest.mock import patch, MagicMock
from pipeline.loaders.enoe_loader import fetch_enoe_indicadores, _fetch_serie, _SERIE_TDA, _SERIE_POB


def test_fetch_retorna_lista_con_campos_correctos():
    def mock_fetch(serie, geo, anio, trim, token):
        return 3.5 if serie == _SERIE_TDA else 2500.0

    with patch("pipeline.loaders.enoe_loader._fetch_serie", side_effect=mock_fetch):
        result = fetch_enoe_indicadores(2025, 1, "fake-token")

    assert len(result) == 33  # Nacional + 32 estados
    nacional = next(r for r in result if r["estado"] == "Nacional")
    assert nacional["tasa_desempleo"] == pytest.approx(3.5)
    assert nacional["poblacion_ocupada"] == 2500
    assert nacional["anio"] == 2025
    assert nacional["trimestre"] == 1


def test_fetch_retorna_lista_vacia_si_token_ausente():
    result = fetch_enoe_indicadores(2025, 1, "")
    assert result == []


def test_fetch_retorna_lista_vacia_si_api_falla_en_todos():
    with patch("pipeline.loaders.enoe_loader._fetch_serie", return_value=None):
        result = fetch_enoe_indicadores(2025, 1, "fake-token")
    assert result == []


def test_fetch_serie_filtra_por_periodo_correcto():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "Series": [{"OBSERVATIONS": [
            {"TIME_PERIOD": "2024/01", "OBS_VALUE": "3.5"},
            {"TIME_PERIOD": "2023/10", "OBS_VALUE": "3.2"},
        ]}]
    }
    mock_resp.raise_for_status = MagicMock()
    with patch("httpx.get", return_value=mock_resp):
        result = _fetch_serie(_SERIE_TDA, "00", 2024, 1, "tok")
    assert result == pytest.approx(3.5)


def test_fetch_serie_retorna_none_si_obs_value_vacio():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "Series": [{"OBSERVATIONS": [{"TIME_PERIOD": "2024/01", "OBS_VALUE": ""}]}]
    }
    mock_resp.raise_for_status = MagicMock()
    with patch("httpx.get", return_value=mock_resp):
        result = _fetch_serie(_SERIE_TDA, "00", 2024, 1, "tok")
    assert result is None
