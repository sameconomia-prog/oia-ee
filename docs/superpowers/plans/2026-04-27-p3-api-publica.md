# P3 API Pública — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar rate limiting por tiers, gestión de API keys via admin, y documentación OpenAPI enriquecida para todos los endpoints `/publico/*`.

**Architecture:** Nueva tabla `api_key` con hash SHA-256 de la raw key y tier. Dependency `rate_limit_public` aplicada a nivel de router en `publico.py`: lee el header `X-API-Key`, determina el tier, aplica el limiter correspondiente. Admin endpoints para crear/listar/revocar keys bajo `/admin/api-keys` protegidos con JWT superadmin. Si Redis no está disponible, rate limiting se deshabilita gracefully.

**Tech Stack:** SQLAlchemy, Alembic, fastapi_limiter, hashlib (stdlib), secrets (stdlib), Pydantic v2, pytest-asyncio

---

## File Map

| Archivo | Acción |
|---------|--------|
| `pipeline/db/models_apikey.py` | Crear — modelo `ApiKey` |
| `pipeline/db/migrations/versions/p3apikey001_api_keys.py` | Crear — migración Alembic |
| `tests/conftest.py` | Modificar — import models_apikey |
| `tests/api/conftest.py` | Modificar — import models_apikey |
| `pipeline/db/migrations/env.py` | Modificar — import models_apikey |
| `api/deps.py` | Modificar — agregar `get_api_key_tier`, `rate_limit_public` |
| `api/middleware/rate_limit.py` | Modificar — agregar `dynamic_rate_limiter` |
| `api/schemas.py` | Modificar — agregar schemas ApiKey |
| `api/routers/api_keys.py` | Crear — endpoints admin |
| `api/routers/publico.py` | Modificar — rate limiting + docs |
| `api/main.py` | Modificar — metadata + router + CORS header |
| `tests/api/test_rate_limit.py` | Crear — tests para get_api_key_tier |
| `tests/api/test_api_keys.py` | Crear — tests para admin endpoints |

---

### Task 1: ApiKey model + migración + conftest updates

**Files:**
- Create: `pipeline/db/models_apikey.py`
- Create: `pipeline/db/migrations/versions/p3apikey001_api_keys.py`
- Modify: `tests/conftest.py`
- Modify: `tests/api/conftest.py`
- Modify: `pipeline/db/migrations/env.py`

- [ ] **Step 1: Crear `pipeline/db/models_apikey.py`**

```python
# pipeline/db/models_apikey.py
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, UniqueConstraint, Index
from pipeline.db.models import Base, _uuid


class ApiKey(Base):
    __tablename__ = "api_key"

    id         = Column(String(36), primary_key=True, default=_uuid)
    key_hash   = Column(String(64), nullable=False)
    key_prefix = Column(String(8), nullable=False)
    name       = Column(String(200), nullable=False)
    email      = Column(String(200), nullable=False)
    tier       = Column(String(20), nullable=False, default="researcher")
    expires_at = Column(Date, nullable=True)
    revoked    = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("key_hash", name="uq_apikey_hash"),
        Index("idx_apikey_hash", "key_hash"),
    )
```

- [ ] **Step 2: Crear `pipeline/db/migrations/versions/p3apikey001_api_keys.py`**

```python
"""p3_api_keys

Revision ID: p3apikey001
Revises: p2enoe001
Create Date: 2026-04-27

"""
from alembic import op
import sqlalchemy as sa

revision = 'p3apikey001'
down_revision = 'p2enoe001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'api_key',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('key_hash', sa.String(64), nullable=False),
        sa.Column('key_prefix', sa.String(8), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('tier', sa.String(20), nullable=False),
        sa.Column('expires_at', sa.Date(), nullable=True),
        sa.Column('revoked', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('key_hash', name='uq_apikey_hash'),
    )
    op.create_index('idx_apikey_hash', 'api_key', ['key_hash'])


def downgrade() -> None:
    op.drop_index('idx_apikey_hash', table_name='api_key')
    op.drop_table('api_key')
```

- [ ] **Step 3: Agregar import en `tests/conftest.py`**

Agregar después de la línea `from pipeline.db import models_enoe`:

```python
from pipeline.db import models_apikey  # noqa: F401 — registers tables with Base
```

- [ ] **Step 4: Agregar import en `tests/api/conftest.py`**

Agregar después de `from pipeline.db.models import Base`:

```python
from pipeline.db import models_imss   # noqa: F401 — registers tables with Base
from pipeline.db import models_enoe   # noqa: F401 — registers tables with Base
from pipeline.db import models_apikey # noqa: F401 — registers tables with Base
```

- [ ] **Step 5: Agregar import en `pipeline/db/migrations/env.py`**

Agregar después de las líneas `from pipeline.db import models_imss` y `from pipeline.db import models_enoe`:

```python
from pipeline.db import models_apikey  # noqa: F401 — registers tables with Base
```

- [ ] **Step 6: Verificar tabla en SQLite**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -c "
from pipeline.db.models_apikey import ApiKey
from pipeline.db.models import Base
from sqlalchemy import create_engine
engine = create_engine('sqlite+pysqlite:///:memory:')
Base.metadata.create_all(engine)
print('tabla creada OK')
"
```

Expected: `tabla creada OK`

- [ ] **Step 7: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q --tb=no
```

Expected: 297 passed, 0 failed

- [ ] **Step 8: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/db/models_apikey.py pipeline/db/migrations/versions/p3apikey001_api_keys.py tests/conftest.py tests/api/conftest.py pipeline/db/migrations/env.py && git commit -m "feat(p3): add ApiKey model and Alembic migration p3apikey001"
```

---

### Task 2: get_api_key_tier + dynamic_rate_limiter con TDD

**Files:**
- Create: `tests/api/test_rate_limit.py`
- Modify: `api/deps.py`
- Modify: `api/middleware/rate_limit.py`

- [ ] **Step 1: Crear `tests/api/test_rate_limit.py` con tests que fallan**

```python
# tests/api/test_rate_limit.py
import hashlib
import pytest
from datetime import date, timedelta
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from pipeline.db import models_apikey  # noqa: F401
from pipeline.db.models_apikey import ApiKey
from api.deps import get_api_key_tier
from api.middleware.rate_limit import dynamic_rate_limiter


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _fake_request(api_key: str = "") -> MagicMock:
    req = MagicMock()
    req.headers = {"X-API-Key": api_key} if api_key else {}
    return req


def _insert_api_key(session, raw_key="testkey123", tier="researcher",
                    revoked=False, expires_at=None) -> ApiKey:
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    ak = ApiKey(
        key_hash=key_hash,
        key_prefix=raw_key[:8],
        name="Test Key",
        email="test@example.com",
        tier=tier,
        revoked=revoked,
        expires_at=expires_at,
    )
    session.add(ak)
    session.flush()
    return ak


def test_sin_header_retorna_anon(session):
    req = _fake_request("")
    tier = get_api_key_tier(req, session)
    assert tier == "anon"


def test_key_valida_researcher_retorna_tier(session):
    raw_key = "researcher_key_test"
    _insert_api_key(session, raw_key=raw_key, tier="researcher")
    req = _fake_request(raw_key)
    tier = get_api_key_tier(req, session)
    assert tier == "researcher"


def test_key_revocada_retorna_anon(session):
    raw_key = "revoked_key_test"
    _insert_api_key(session, raw_key=raw_key, revoked=True)
    req = _fake_request(raw_key)
    tier = get_api_key_tier(req, session)
    assert tier == "anon"


def test_key_expirada_retorna_anon(session):
    raw_key = "expired_key_test"
    _insert_api_key(session, raw_key=raw_key,
                    expires_at=date.today() - timedelta(days=1))
    req = _fake_request(raw_key)
    tier = get_api_key_tier(req, session)
    assert tier == "anon"


def test_key_no_registrada_retorna_anon(session):
    req = _fake_request("completely_unknown_key")
    tier = get_api_key_tier(req, session)
    assert tier == "anon"


def test_dynamic_rate_limiter_sin_redis_retorna_none():
    # FastAPILimiter not initialized in tests → graceful degradation
    result = dynamic_rate_limiter("anon")
    assert result is None


def test_dynamic_rate_limiter_premium_retorna_none():
    result = dynamic_rate_limiter("premium")
    assert result is None
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/api/test_rate_limit.py -v
```

Expected: ImportError o AttributeError — `get_api_key_tier` no existe aún

- [ ] **Step 3: Agregar `get_api_key_tier` en `api/deps.py`**

Agregar al final de `api/deps.py` (después de `get_superadmin_user = require_roles("superadmin")`):

```python
import hashlib
from datetime import date
from fastapi import Request
from pipeline.db.models_apikey import ApiKey


def get_api_key_tier(request: Request, db: Session = Depends(get_db)) -> str:
    """Lee X-API-Key, valida contra BD, retorna tier. Siempre retorna 'anon' en caso de duda."""
    raw_key = request.headers.get("X-API-Key", "")
    if not raw_key:
        return "anon"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    api_key = db.query(ApiKey).filter_by(key_hash=key_hash).first()
    if not api_key:
        return "anon"
    if api_key.revoked:
        return "anon"
    if api_key.expires_at and api_key.expires_at < date.today():
        return "anon"
    return api_key.tier
```

- [ ] **Step 4: Agregar `dynamic_rate_limiter` en `api/middleware/rate_limit.py`**

Reemplazar el contenido completo de `api/middleware/rate_limit.py` con:

```python
"""Rate limiting tiers para OIA-EE.

Tiers:
  anon       — 30 req/min (API pública sin key)
  researcher — 300 req/min (API key de investigador)
  premium    — sin límite (instituciones con contrato)
"""
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

RATE_LIMITS = {
    "anon": "30/minute",
    "researcher": "300/minute",
    "premium": "unlimited",
}

# Dependencias FastAPI listas para usar en routers
anon_limit = RateLimiter(times=30, seconds=60)
researcher_limit = RateLimiter(times=300, seconds=60)


def dynamic_rate_limiter(tier: str):
    """Retorna instancia RateLimiter para el tier dado, o None si Redis no está disponible o es premium."""
    try:
        if FastAPILimiter.redis is None:
            return None
    except AttributeError:
        return None
    if tier == "premium":
        return None
    elif tier == "researcher":
        return RateLimiter(times=300, seconds=60)
    return RateLimiter(times=30, seconds=60)
```

- [ ] **Step 5: Correr tests — verificar que pasan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/api/test_rate_limit.py -v
```

Expected: 7 passed

- [ ] **Step 6: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q --tb=no
```

Expected: 304 passed, 0 failed

- [ ] **Step 7: Commit**

```bash
cd ~/Documents/OIA-EE && git add api/deps.py api/middleware/rate_limit.py tests/api/test_rate_limit.py && git commit -m "feat(p3): add get_api_key_tier dependency and dynamic_rate_limiter"
```

---

### Task 3: rate_limit_public + aplicar al router publico

**Files:**
- Modify: `api/deps.py`
- Modify: `api/routers/publico.py`

- [ ] **Step 1: Agregar `rate_limit_public` en `api/deps.py`**

Agregar al final de `api/deps.py` (después de `get_api_key_tier`):

```python
from fastapi import Response
from api.middleware.rate_limit import dynamic_rate_limiter


async def rate_limit_public(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> None:
    """Dependency: aplica rate limiting según tier del API key (o anon si no hay key).
    Graceful degradation: si Redis no está disponible, no hace nada."""
    tier = get_api_key_tier(request, db)
    limiter = dynamic_rate_limiter(tier)
    if limiter is not None:
        await limiter(request=request, response=response)
```

- [ ] **Step 2: Verificar que api/deps.py importa sin error**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -c "from api.deps import rate_limit_public; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Aplicar `rate_limit_public` al router en `api/routers/publico.py`**

Modificar la línea que define el router (línea 12 aprox):

Cambiar:
```python
router = APIRouter()
```

Por:
```python
from api.deps import rate_limit_public
router = APIRouter(dependencies=[Depends(rate_limit_public)])
```

- [ ] **Step 4: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q --tb=no
```

Expected: 304 passed, 0 failed (el rate limiter está deshabilitado en tests por ausencia de Redis, no rompe nada)

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/OIA-EE && git add api/deps.py api/routers/publico.py && git commit -m "feat(p3): apply rate_limit_public dependency to all /publico/* endpoints"
```

---

### Task 4: Admin API keys endpoints con TDD

**Files:**
- Modify: `api/schemas.py`
- Create: `api/routers/api_keys.py`
- Create: `tests/api/test_api_keys.py`

- [ ] **Step 1: Agregar schemas ApiKey en `api/schemas.py`**

Agregar al final de `api/schemas.py`:

```python
class ApiKeyCreateIn(BaseModel):
    name: str
    email: str
    tier: str = "researcher"  # "anon" | "researcher" | "premium"
    expires_at: Optional[str] = None  # "YYYY-MM-DD" o null


class ApiKeyCreateOut(BaseModel):
    id: str
    raw_key: str
    key_prefix: str
    name: str
    email: str
    tier: str
    expires_at: Optional[str] = None


class ApiKeyListItem(BaseModel):
    id: str
    key_prefix: str
    name: str
    email: str
    tier: str
    expires_at: Optional[str] = None
    revoked: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ApiKeyRevokeOut(BaseModel):
    id: str
    revoked: bool
```

- [ ] **Step 2: Crear `tests/api/test_api_keys.py` con tests que fallan**

```python
# tests/api/test_api_keys.py
import pytest
import uuid
from passlib.context import CryptContext
from pipeline.db.models import IES, Usuario

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


def test_crear_api_key_retorna_raw_key(superadmin_client):
    resp = superadmin_client.post(
        "/admin/api-keys",
        json={"name": "UNAM Test", "email": "test@unam.mx", "tier": "researcher"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["raw_key"].startswith("sk_oa_")
    assert len(data["raw_key"]) > 10
    assert data["key_prefix"] == data["raw_key"][:8]
    assert data["tier"] == "researcher"
    assert data["name"] == "UNAM Test"


def test_listar_api_keys_no_incluye_hash(superadmin_client):
    superadmin_client.post(
        "/admin/api-keys",
        json={"name": "Key A", "email": "a@test.mx", "tier": "researcher"},
    )
    resp = superadmin_client.get("/admin/api-keys")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    item = items[0]
    assert "raw_key" not in item
    assert "key_hash" not in item
    assert "key_prefix" in item
    assert "tier" in item
    assert "revoked" in item


def test_revocar_api_key(superadmin_client):
    create_resp = superadmin_client.post(
        "/admin/api-keys",
        json={"name": "Key Revocable", "email": "r@test.mx", "tier": "researcher"},
    )
    key_id = create_resp.json()["id"]
    resp = superadmin_client.delete(f"/admin/api-keys/{key_id}")
    assert resp.status_code == 200
    assert resp.json()["revoked"] is True


def test_sin_auth_devuelve_401(client):
    resp = client.post(
        "/admin/api-keys",
        json={"name": "X", "email": "x@x.mx", "tier": "researcher"},
    )
    assert resp.status_code == 401


def test_rol_no_superadmin_devuelve_403(authed_client):
    client, _ = authed_client
    resp = client.post(
        "/admin/api-keys",
        json={"name": "X", "email": "x@x.mx", "tier": "researcher"},
    )
    assert resp.status_code == 403
```

- [ ] **Step 3: Correr tests — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/api/test_api_keys.py -v
```

Expected: ERROR — ruta `/admin/api-keys` no existe

- [ ] **Step 4: Crear `api/routers/api_keys.py`**

```python
# api/routers/api_keys.py
import hashlib
import secrets
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.deps import get_db, require_roles
from api.schemas import ApiKeyCreateIn, ApiKeyCreateOut, ApiKeyListItem, ApiKeyRevokeOut
from pipeline.db.models_apikey import ApiKey

router = APIRouter()

_require_superadmin = require_roles("superadmin")


@router.post("", response_model=ApiKeyCreateOut)
def crear_api_key(
    body: ApiKeyCreateIn,
    db: Session = Depends(get_db),
    _: object = Depends(_require_superadmin),
):
    raw_key = "sk_oa_" + secrets.token_hex(16)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]

    expires_at = None
    if body.expires_at:
        try:
            expires_at = date.fromisoformat(body.expires_at)
        except ValueError:
            raise HTTPException(status_code=422, detail="expires_at debe ser YYYY-MM-DD")

    api_key = ApiKey(
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=body.name,
        email=body.email,
        tier=body.tier,
        expires_at=expires_at,
    )
    db.add(api_key)
    db.flush()
    db.commit()

    return ApiKeyCreateOut(
        id=api_key.id,
        raw_key=raw_key,
        key_prefix=key_prefix,
        name=api_key.name,
        email=api_key.email,
        tier=api_key.tier,
        expires_at=str(api_key.expires_at) if api_key.expires_at else None,
    )


@router.get("", response_model=list[ApiKeyListItem])
def listar_api_keys(
    db: Session = Depends(get_db),
    _: object = Depends(_require_superadmin),
):
    keys = db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()
    return [
        ApiKeyListItem(
            id=k.id,
            key_prefix=k.key_prefix,
            name=k.name,
            email=k.email,
            tier=k.tier,
            expires_at=str(k.expires_at) if k.expires_at else None,
            revoked=k.revoked,
            created_at=k.created_at,
        )
        for k in keys
    ]


@router.delete("/{key_id}", response_model=ApiKeyRevokeOut)
def revocar_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    _: object = Depends(_require_superadmin),
):
    api_key = db.query(ApiKey).filter_by(id=key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key no encontrada")
    api_key.revoked = True
    db.commit()
    return ApiKeyRevokeOut(id=api_key.id, revoked=True)
```

- [ ] **Step 5: Correr tests — verificar que pasan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/api/test_api_keys.py -v
```

Expected: 5 passed (nota: el router aún no está registrado en main.py, por lo que puede fallar — si falla con 404, avanzar al Task 5 primero y volver a correr)

- [ ] **Step 6: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q --tb=no
```

Expected: 309+ passed, 0 failed

- [ ] **Step 7: Commit**

```bash
cd ~/Documents/OIA-EE && git add api/schemas.py api/routers/api_keys.py tests/api/test_api_keys.py && git commit -m "feat(p3): add admin API keys endpoints (create, list, revoke)"
```

---

### Task 5: Actualizar api/main.py — metadata + router + CORS

**Files:**
- Modify: `api/main.py`

- [ ] **Step 1: Modificar `api/main.py`**

Hacer los tres cambios siguientes en `api/main.py`:

**Cambio A** — Actualizar import de routers (línea 10) para incluir `api_keys`:

```python
from api.routers import noticias, kpis, admin, rector, alertas, escenarios, auth, publico, radar, predicciones
from api.routers import api_keys
```

**Cambio B** — Reemplazar la instanciación del app (línea 85):

Cambiar:
```python
app = FastAPI(title="OIA-EE API", version="0.9.0", lifespan=lifespan)
```

Por:
```python
app = FastAPI(
    title="OIA-EE API",
    version="1.0.0",
    description=(
        "Observatorio de Impacto IA en Educación y Empleo (OIA-EE). "
        "Mide el desplazamiento de carreras universitarias mexicanas por IA "
        "usando 7 indicadores KPI: D1 Obsolescencia, D2 Oportunidades, "
        "D3 Mercado Laboral, D4 Institucional, D5 Geografía, D6 Estudiantil, D7 Noticias. "
        "\n\n**Autenticación:** Endpoints públicos disponibles sin autenticación. "
        "Para cuotas mayores, incluye el header `X-API-Key` con tu token de acceso."
    ),
    contact={"name": "OIA-EE", "email": "sam.economia@gmail.com"},
    lifespan=lifespan,
)
```

**Cambio C** — Actualizar `allow_headers` en CORS (línea ~92):

Cambiar:
```python
    allow_headers=["Authorization", "Content-Type"],
```

Por:
```python
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
```

**Cambio D** — Registrar el router de api_keys (después de `app.include_router(admin.router, ...)`):

```python
app.include_router(api_keys.router, prefix="/admin/api-keys", tags=["admin"])
```

- [ ] **Step 2: Verificar que la app importa sin error**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -c "from api.main import app; print('app OK')"
```

Expected: `app OK`

- [ ] **Step 3: Correr tests de api_keys para verificar que el router está registrado**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/api/test_api_keys.py -v
```

Expected: 5 passed

- [ ] **Step 4: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q --tb=no
```

Expected: 309+ passed, 0 failed

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/OIA-EE && git add api/main.py && git commit -m "feat(p3): update app metadata, CORS headers, and register api_keys router"
```

---

### Task 6: OpenAPI docs — descripciones y ejemplos en endpoints públicos

**Files:**
- Modify: `api/routers/publico.py`

Agregar `summary`, `description`, y `openapi_extra` con ejemplos a cada uno de los siguientes endpoints. Los decoradores van en las funciones existentes — NO cambiar la lógica interna.

- [ ] **Step 1: Decorar `GET /resumen`**

Reemplazar:
```python
@router.get("/resumen", response_model=ResumenPublico)
def resumen_publico(db: Session = Depends(get_db)):
```

Por:
```python
@router.get(
    "/resumen",
    response_model=ResumenPublico,
    summary="Resumen del observatorio",
    description="Retorna totales de IES activas, noticias, vacantes IA y alertas activas, más las 5 noticias más recientes.",
    openapi_extra={"responses": {"200": {"content": {"application/json": {"example": {
        "total_ies": 150, "total_noticias": 842, "total_vacantes": 1230,
        "alertas_activas": 12, "noticias_recientes": []
    }}}}}},
)
def resumen_publico(db: Session = Depends(get_db)):
```

- [ ] **Step 2: Decorar `GET /carreras/areas`**

Reemplazar:
```python
@router.get("/carreras/areas")
def listar_areas_carreras(db: Session = Depends(get_db)):
```

Por:
```python
@router.get(
    "/carreras/areas",
    summary="Áreas de conocimiento",
    description="Lista las áreas de conocimiento únicas de todas las carreras activas. Úsalas como filtro en GET /carreras?area=.",
    openapi_extra={"responses": {"200": {"content": {"application/json": {"example": [
        "Ciencias de la Salud", "Ingeniería y Tecnología", "Ciencias Sociales"
    ]}}}}},
)
def listar_areas_carreras(db: Session = Depends(get_db)):
```

- [ ] **Step 3: Decorar `GET /carreras`**

Reemplazar:
```python
@router.get("/carreras", response_model=list[CarreraKpiOut])
def listar_carreras_publico(
```

Por:
```python
@router.get(
    "/carreras",
    response_model=list[CarreraKpiOut],
    summary="Buscar carreras universitarias",
    description=(
        "Retorna carreras activas con KPIs D1–D6. "
        "Parámetros opcionales: `q` (búsqueda por nombre), `area` (filtro por área de conocimiento), "
        "`skip`/`limit` (paginación). Resultados cacheados 5 minutos."
    ),
    openapi_extra={"responses": {"200": {"content": {"application/json": {"example": [
        {"id": "abc123", "nombre": "Ingeniería en Sistemas", "area_conocimiento": "Ingeniería y Tecnología",
         "matricula": 1200, "kpi": {"carrera_id": "abc123", "d1_obsolescencia": {"score": 0.72},
                                    "d2_oportunidades": {"score": 0.55}}}
    ]}}}}},
)
def listar_carreras_publico(
```

- [ ] **Step 4: Decorar `GET /kpis/resumen`**

Reemplazar:
```python
@router.get("/kpis/resumen", response_model=KpisNacionalResumenOut)
def resumen_kpis_nacional(db: Session = Depends(get_db)):
```

Por:
```python
@router.get(
    "/kpis/resumen",
    response_model=KpisNacionalResumenOut,
    summary="KPIs nacionales promedio",
    description="Promedio nacional de D1–D6 sobre todas las carreras activas. Resultados cacheados 5 minutos.",
    openapi_extra={"responses": {"200": {"content": {"application/json": {"example": {
        "total_carreras": 820, "promedio_d1": 0.42, "promedio_d2": 0.58,
        "promedio_d3": 0.31, "promedio_d6": 0.65,
        "carreras_riesgo_alto": 124, "carreras_oportunidad_alta": 210
    }}}}}},
)
def resumen_kpis_nacional(db: Session = Depends(get_db)):
```

- [ ] **Step 5: Decorar `GET /estadisticas`**

Reemplazar:
```python
@router.get("/estadisticas", response_model=EstadisticasPublicasOut)
def estadisticas_publicas(db: Session = Depends(get_db)):
```

Por:
```python
@router.get(
    "/estadisticas",
    response_model=EstadisticasPublicasOut,
    summary="Estadísticas globales del observatorio",
    description="Totales de IES, carreras, vacantes, noticias, alertas activas y top 3 skills demandados.",
    openapi_extra={"responses": {"200": {"content": {"application/json": {"example": {
        "total_ies": 150, "total_carreras": 820, "total_vacantes": 1230,
        "total_noticias": 842, "alertas_activas": 12,
        "top_skills": ["Python", "Machine Learning", "Data Science"]
    }}}}}},
)
def estadisticas_publicas(db: Session = Depends(get_db)):
```

- [ ] **Step 6: Decorar `GET /vacantes`**

Reemplazar:
```python
@router.get("/vacantes", response_model=list[VacantePublicoOut])
def listar_vacantes_publico(
```

Por:
```python
@router.get(
    "/vacantes",
    response_model=list[VacantePublicoOut],
    summary="Buscar vacantes de trabajo en IA",
    description=(
        "Lista vacantes relacionadas con IA/automatización. "
        "Filtros opcionales: `sector`, `q` (búsqueda por título/empresa/estado). "
        "`skip`/`limit` para paginación (default limit=25)."
    ),
    openapi_extra={"responses": {"200": {"content": {"application/json": {"example": [
        {"id": "vac001", "titulo": "Data Scientist", "empresa": "BBVA México",
         "sector": "Finanzas", "skills": ["Python", "SQL"], "estado": "Ciudad de México",
         "salario_min": 25000, "salario_max": 45000, "nivel_educativo": "Licenciatura",
         "fecha_pub": "2025-03-15"}
    ]}}}}},
)
def listar_vacantes_publico(
```

- [ ] **Step 7: Decorar `GET /vacantes/tendencia`**

Reemplazar:
```python
@router.get("/vacantes/tendencia")
def tendencia_vacantes(meses: int = 12, db: Session = Depends(get_db)):
```

Por:
```python
@router.get(
    "/vacantes/tendencia",
    summary="Tendencia mensual de vacantes IA",
    description="Conteo de vacantes publicadas por mes. Parámetro `meses` (default 12) limita el historial.",
    openapi_extra={"responses": {"200": {"content": {"application/json": {"example": [
        {"mes": "2025-01", "count": 38},
        {"mes": "2025-02", "count": 45},
        {"mes": "2025-03", "count": 52}
    ]}}}}},
)
def tendencia_vacantes(meses: int = 12, db: Session = Depends(get_db)):
```

- [ ] **Step 8: Decorar `GET /vacantes/skills`**

Reemplazar:
```python
@router.get("/vacantes/skills", response_model=list[SkillFreqOut])
def top_vacantes_skills(top: int = 10, db: Session = Depends(get_db)):
```

Por:
```python
@router.get(
    "/vacantes/skills",
    response_model=list[SkillFreqOut],
    summary="Top skills demandados en vacantes",
    description="Las habilidades más frecuentes en las vacantes IA activas. Parámetro `top` (default 10).",
    openapi_extra={"responses": {"200": {"content": {"application/json": {"example": [
        {"nombre": "Python", "count": 340},
        {"nombre": "Machine Learning", "count": 210},
        {"nombre": "SQL", "count": 185}
    ]}}}}},
)
def top_vacantes_skills(top: int = 10, db: Session = Depends(get_db)):
```

- [ ] **Step 9: Decorar `GET /vacantes/{vacante_id}`**

Reemplazar:
```python
@router.get("/vacantes/{vacante_id}", response_model=VacantePublicoOut)
def detalle_vacante(vacante_id: str, db: Session = Depends(get_db)):
```

Por:
```python
@router.get(
    "/vacantes/{vacante_id}",
    response_model=VacantePublicoOut,
    summary="Detalle de vacante",
    description="Retorna todos los campos de una vacante específica por su ID.",
    openapi_extra={"responses": {
        "200": {"content": {"application/json": {"example": {
            "id": "vac001", "titulo": "Data Scientist", "empresa": "BBVA México",
            "sector": "Finanzas", "skills": ["Python", "SQL"],
            "estado": "Ciudad de México", "salario_min": 25000, "salario_max": 45000,
            "nivel_educativo": "Licenciatura", "fecha_pub": "2025-03-15"
        }}}},
        "404": {"description": "Vacante no encontrada"},
    }},
)
def detalle_vacante(vacante_id: str, db: Session = Depends(get_db)):
```

- [ ] **Step 10: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q --tb=no
```

Expected: 309+ passed, 0 failed

- [ ] **Step 11: Verificar docs en dev**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && uvicorn api.main:app --reload --port 8001 &
sleep 3 && curl -s http://localhost:8001/openapi.json | python -m json.tool | grep '"summary"' | head -10
kill %1
```

Expected: varias líneas con `"summary": "Resumen del observatorio"`, etc.

- [ ] **Step 12: Commit**

```bash
cd ~/Documents/OIA-EE && git add api/routers/publico.py && git commit -m "feat(p3): add OpenAPI summaries and response examples to /publico/* endpoints"
```

---

### Task 7: Push a GitHub + nota Obsidian

**Files:**
- External: GitHub + Obsidian Vault

- [ ] **Step 1: Push a origin**

```bash
cd ~/Documents/OIA-EE && git push origin main
```

- [ ] **Step 2: Crear nota en Obsidian**

Crear `/Users/arturoaguilar/Documents/Obsidian Vault/01 - Proyectos/OIA-EE/p3-api-publica-completado.md`:

```markdown
# P3 API Pública — Completado 2026-04-27

## Resumen
Rate limiting por tiers activado, API keys gestionadas por admin, docs OpenAPI enriquecidos.

## Qué se implementó
- `pipeline/db/models_apikey.py` — modelo ApiKey con hash + tier + expiración
- Migración Alembic `p3apikey001` (down_revision: p2enoe001)
- `api/deps.py` — `get_api_key_tier()` + `rate_limit_public()`
- `api/middleware/rate_limit.py` — `dynamic_rate_limiter()` con graceful degradation
- `api/routers/api_keys.py` — POST/GET/DELETE /admin/api-keys (superadmin only)
- `api/routers/publico.py` — rate limiting aplicado a nivel router + docs por endpoint
- `api/main.py` — metadata v1.0.0, CORS con X-API-Key, router api_keys registrado

## Tiers
- anon: 30 req/min (sin key)
- researcher: 300 req/min (key activa y no expirada)
- premium: sin límite

## Variable de entorno
`REDIS_URL` — requerida para activar rate limiting. Sin ella, API funciona igual.
Añadir en Railway: servicio Redis → REDIS_URL autoconfigurado.

#OIA-EE #p3 #api-publica #rate-limiting #completado #2026-04-27
```

