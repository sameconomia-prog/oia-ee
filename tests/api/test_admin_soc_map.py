# tests/api/test_admin_soc_map.py
import json
import uuid

import pytest
from passlib.context import CryptContext

from pipeline.db.models import IES, Carrera, Usuario
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture
def superadmin_client(client, db_session):
    """Client con JWT de superadmin."""
    ies = IES(nombre=f"IES Superadmin {uuid.uuid4().hex[:4]}", nombre_corto="ISA")
    db_session.add(ies)
    db_session.flush()
    username = f"superadmin_{uuid.uuid4().hex[:6]}"
    user = Usuario(
        username=username,
        hashed_password=_pwd_ctx.hash("super_pass"),
        ies_id=ies.id,
        rol="superadmin",
    )
    db_session.add(user)
    db_session.flush()
    resp = client.post("/auth/login", data={"username": username, "password": "super_pass"})
    assert resp.status_code == 200, f"Login falló: {resp.text}"
    token = resp.json()["access_token"]
    client.headers = {**client.headers, "Authorization": f"Bearer {token}"}
    return client


@pytest.fixture
def carrera_con_iex(db_session):
    c = Carrera(nombre_norm=f"carrera socmap {uuid.uuid4().hex[:6]}",
                onet_codes_relacionados=json.dumps([]))
    db_session.add(c)
    if not db_session.get(ExposicionIEX, "15-1252"):
        db_session.add(ExposicionIEX(soc_code="15-1252", iex_v2=5.769,
                                     elasticidad_mx="E-Alta"))
    db_session.flush()
    return c


def test_soc_map_sin_jwt_devuelve_401(client):
    assert client.get("/admin/soc-map").status_code == 401


def test_put_crea_mapeo_como_edicion_manual(superadmin_client, carrera_con_iex):
    resp = superadmin_client.put("/admin/soc-map", json={
        "carrera_id": carrera_con_iex.id, "soc_code": "15-1252", "peso": 2.0})
    assert resp.status_code == 200
    data = resp.json()
    assert data["soc_code"] == "15-1252"
    assert data["peso"] == 2.0
    assert data["es_aproximacion"] is False
    assert data["fuente"] == "superadmin"


def test_put_actualiza_peso_de_mapeo_existente(superadmin_client, carrera_con_iex, db_session):
    db_session.add(CarreraSocMap(carrera_id=carrera_con_iex.id, soc_code="15-1252",
                                 peso=1.0, es_aproximacion=True,
                                 fuente="seed_onet_truncado"))
    db_session.flush()
    resp = superadmin_client.put("/admin/soc-map", json={
        "carrera_id": carrera_con_iex.id, "soc_code": "15-1252", "peso": 0.5})
    assert resp.status_code == 200
    assert resp.json()["peso"] == 0.5
    assert resp.json()["es_aproximacion"] is False


def test_put_soc_inexistente_devuelve_422(superadmin_client, carrera_con_iex):
    resp = superadmin_client.put("/admin/soc-map", json={
        "carrera_id": carrera_con_iex.id, "soc_code": "00-0000"})
    assert resp.status_code == 422


def test_put_carrera_inexistente_devuelve_404(superadmin_client, carrera_con_iex):
    resp = superadmin_client.put("/admin/soc-map", json={
        "carrera_id": "no-existe", "soc_code": "15-1252"})
    assert resp.status_code == 404


def test_get_filtra_por_carrera(superadmin_client, carrera_con_iex, db_session):
    db_session.add(CarreraSocMap(carrera_id=carrera_con_iex.id, soc_code="15-1252"))
    db_session.flush()
    resp = superadmin_client.get(f"/admin/soc-map?carrera_id={carrera_con_iex.id}")
    assert resp.status_code == 200
    socs = [m["soc_code"] for m in resp.json()]
    assert socs == ["15-1252"]


def test_delete_elimina_mapeo(superadmin_client, carrera_con_iex, db_session):
    row = CarreraSocMap(carrera_id=carrera_con_iex.id, soc_code="15-1252")
    db_session.add(row)
    db_session.flush()
    resp = superadmin_client.delete(f"/admin/soc-map/{row.id}")
    assert resp.status_code == 204
    assert superadmin_client.delete(f"/admin/soc-map/{row.id}").status_code == 404
