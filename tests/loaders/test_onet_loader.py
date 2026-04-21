import pytest
import respx
import httpx
import json
from pathlib import Path
from pipeline.loaders.onet_loader import OnetLoader, OnetOccupation

FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures" / "onet_occupation.json").read_text()
)

@respx.mock
def test_fetch_occupation():
    code = "15-1252.00"
    respx.get(f"https://services.onetcenter.org/ws/online/occupations/{code}").mock(
        return_value=httpx.Response(200, json=FIXTURE)
    )
    loader = OnetLoader(username="test", password="test")
    occ = loader.fetch_occupation(code)
    assert isinstance(occ, OnetOccupation)
    assert occ.onet_code == "15-1252.00"
    assert occ.nombre == "Software Developers"
    assert occ.p_automatizacion == 0.18
    assert "Programming" in occ.skills

@respx.mock
def test_fetch_occupation_404_returns_none():
    respx.get("https://services.onetcenter.org/ws/online/occupations/99-9999.99").mock(
        return_value=httpx.Response(404)
    )
    loader = OnetLoader(username="test", password="test")
    assert loader.fetch_occupation("99-9999.99") is None
