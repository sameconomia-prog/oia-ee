# tests/loaders/test_imss_loader.py
import pytest
from unittest.mock import patch, MagicMock
from pipeline.loaders.imss_loader import fetch_imss_empleo, _normalizar_estado


def _mock_ckan_response(records: list[dict]) -> MagicMock:
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {
        "result": {
            "records": records,
            "total": len(records),
        }
    }
    return resp


def test_fetch_retorna_lista_de_dicts_con_campos_correctos():
    fake_records = [
        {
            "estado": "Jalisco",
            "sector": "31",
            "desc_sector": "Industrias manufactureras",
            "total_trabajadores": "125000",
            "anio": "2025",
            "mes": "3",
        }
    ]
    with patch("pipeline.loaders.imss_loader.httpx.get",
               return_value=_mock_ckan_response(fake_records)):
        result = fetch_imss_empleo(2025, 3)

    assert len(result) == 1
    r = result[0]
    assert r["estado"] == "Jalisco"
    assert r["sector_scian"] == "31"
    assert r["sector_nombre"] == "Industrias manufactureras"
    assert r["trabajadores"] == 125000
    assert r["anio"] == 2025
    assert r["mes"] == 3


def test_fetch_retorna_lista_vacia_si_api_falla():
    with patch("pipeline.loaders.imss_loader.httpx.get",
               side_effect=Exception("connection timeout")):
        result = fetch_imss_empleo(2025, 3)

    assert result == []


def test_normalizar_estado_cdmx():
    assert _normalizar_estado("Ciudad de México") == "Ciudad de México"
    assert _normalizar_estado("CDMX") == "Ciudad de México"
    assert _normalizar_estado("D.F.") == "Ciudad de México"


def test_normalizar_estado_preserva_nombre_normal():
    assert _normalizar_estado("Jalisco") == "Jalisco"
    assert _normalizar_estado("Nuevo León") == "Nuevo León"
