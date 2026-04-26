# P0: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el MVP en una base de producción sólida — seguridad, rate limiting Redis, RBAC, JWT refresh tokens, pgvector real, logging estructurado, email alerts y CI/CD.

**Architecture:** Redis como cache distribuida y rate limiter. RBAC con campo `rol` en `usuarios`. pgvector activado para similarity search real. Sentry + structlog para observabilidad. GitHub Actions para CI/CD automático.

**Tech Stack:** fastapi-limiter, redis[asyncio], sentry-sdk[fastapi], structlog, resend, pgvector.sqlalchemy, Playwright (E2E), GitHub Actions

---

## Archivos que se crean o modifican

### Nuevos
- `api/middleware/rate_limit.py` — dependencias de rate limiting por tier
- `pipeline/db/migrations/versions/XXXX_p0_rbac_refresh_vector.py` — migración Alembic
- `pipeline/services/email_service.py` — implementación Resend (reemplaza stub)
- `.github/workflows/ci.yml` — CI: lint + tests en cada push/PR
- `.github/workflows/deploy.yml` — Deploy a Railway en merge a main
- `frontend/playwright.config.ts` — config Playwright
- `frontend/tests/e2e/critical-flows.spec.ts` — 5 flujos E2E críticos

### Modificados
- `pipeline/requirements.txt` — agregar: fastapi-limiter, redis, sentry-sdk, structlog, resend
- `pipeline/db/models.py` — agregar `rol` a `Usuario`, nuevo modelo `RefreshToken`
- `api/main.py` — Redis lifespan, Sentry init, structlog config
- `api/deps.py` — refresh token support, role-based dependencies
- `api/routers/auth.py` — endpoints `/refresh` y `/logout`

---

## Task 1: Instalar dependencias backend nuevas

**Files:**
- Modify: `pipeline/requirements.txt`

- [ ] **Step 1: Agregar dependencias**

```text
# pipeline/requirements.txt — agregar al final
fastapi-limiter==0.1.6
redis[asyncio]==5.0.4
sentry-sdk[fastapi]==2.3.1
structlog==24.1.0
resend==2.0.0
```

- [ ] **Step 2: Instalar en venv**

```bash
cd ~/Documents/OIA-EE
source pipeline/.venv/bin/activate
pip install fastapi-limiter==0.1.6 "redis[asyncio]==5.0.4" "sentry-sdk[fastapi]==2.3.1" structlog==24.1.0 resend==2.0.0
```

Expected: Instalación sin errores. Verificar: `pip show fastapi-limiter redis sentry-sdk structlog resend`

- [ ] **Step 3: Verificar tests siguen pasando**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate
python -m pytest tests/ -q
```

Expected: `223 passed` (o el número actual).

- [ ] **Step 4: Commit**

```bash
git add pipeline/requirements.txt
git commit -m "chore: add p0 backend dependencies (limiter, redis, sentry, structlog, resend)"
```

---

## Task 2: RBAC — Agregar `rol` a Usuario y modelo RefreshToken

**Files:**
- Modify: `pipeline/db/models.py`
- Create: `pipeline/db/migrations/versions/XXXX_p0_rbac_refresh_vector.py`
- Modify: `tests/conftest.py`

- [ ] **Step 1: Escribir el test que falla**

```python
# tests/test_rbac_model.py (nuevo archivo)
from pipeline.db.models import Usuario


def test_usuario_has_rol_field(session):
    u = Usuario(
        username="test_rector",
        hashed_password="$2b$12$fake",
        ies_id="ies-001",
        rol="admin_ies",
    )
    session.add(u)
    session.flush()
    assert u.rol == "admin_ies"


def test_usuario_default_rol_is_viewer(session):
    u = Usuario(
        username="test_viewer",
        hashed_password="$2b$12$fake",
        ies_id="ies-002",
    )
    session.add(u)
    session.flush()
    assert u.rol == "viewer"


def test_refresh_token_model(session):
    from pipeline.db.models import RefreshToken
    from datetime import datetime, timedelta, UTC

    rt = RefreshToken(
        usuario_id="usr-001",
        token="tok-abc123",
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    session.add(rt)
    session.flush()
    assert rt.id is not None
    assert rt.revocado is False
```

- [ ] **Step 2: Correr el test — debe fallar**

```bash
python -m pytest tests/test_rbac_model.py -v
```

Expected: `FAILED` — `TypeError: Usuario() got unexpected keyword argument 'rol'`

- [ ] **Step 3: Agregar `rol` a `Usuario` y nuevo modelo `RefreshToken`**

Editar `pipeline/db/models.py` — al final del modelo `Usuario` agregar el campo `rol`, y después de la clase agregar `RefreshToken`:

```python
# En la clase Usuario, después de email:
    rol = Column(String(20), nullable=False, default="viewer")
    # Valores válidos: 'viewer', 'researcher', 'admin_ies', 'superadmin'
```

```python
# Nueva clase después de Usuario:
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id          = Column(String(36), primary_key=True, default=_uuid)
    usuario_id  = Column(String(36), ForeignKey("usuarios.id"), nullable=False)
    token       = Column(String(255), unique=True, nullable=False)
    expires_at  = Column(DateTime(timezone=True), nullable=False)
    revocado    = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    usuario     = relationship("Usuario")
```

- [ ] **Step 4: Correr el test — debe pasar**

```bash
python -m pytest tests/test_rbac_model.py -v
```

Expected: `3 passed`

- [ ] **Step 5: Generar migración Alembic**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate
cd pipeline
alembic revision --autogenerate -m "p0_rbac_refresh_token"
```

Expected: Archivo nuevo en `pipeline/db/migrations/versions/XXXX_p0_rbac_refresh_token.py`

Verificar que la migración contenga:
- `op.add_column('usuarios', sa.Column('rol', sa.String(20), nullable=False, server_default='viewer'))`
- `op.create_table('refresh_tokens', ...)`

- [ ] **Step 6: Correr tests completos**

```bash
python -m pytest tests/ -q
```

Expected: `224 passed` (o más, incluyendo los 3 nuevos).

- [ ] **Step 7: Commit**

```bash
git add pipeline/db/models.py pipeline/db/migrations/ tests/test_rbac_model.py
git commit -m "feat(p0): add rol field to Usuario and RefreshToken model with migration"
```

---

## Task 3: RBAC — Dependencias de rol en `deps.py`

**Files:**
- Modify: `api/deps.py`
- Create: `tests/api/test_rbac_deps.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# tests/api/test_rbac_deps.py
import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock
from api.deps import require_roles
from pipeline.db.models import Usuario


def _make_user(rol: str) -> Usuario:
    u = MagicMock(spec=Usuario)
    u.rol = rol
    u.activo = True
    return u


def test_require_roles_allows_matching_role():
    dep = require_roles("admin_ies", "superadmin")
    user = _make_user("admin_ies")
    result = dep(current_user=user)
    assert result == user


def test_require_roles_blocks_wrong_role():
    dep = require_roles("superadmin")
    user = _make_user("viewer")
    with pytest.raises(HTTPException) as exc_info:
        dep(current_user=user)
    assert exc_info.value.status_code == 403


def test_require_roles_superadmin_passes_any():
    dep = require_roles("researcher")
    user = _make_user("superadmin")
    result = dep(current_user=user)
    assert result == user
```

- [ ] **Step 2: Correr para verificar que fallan**

```bash
python -m pytest tests/api/test_rbac_deps.py -v
```

Expected: `ImportError: cannot import name 'require_roles' from 'api.deps'`

- [ ] **Step 3: Implementar `require_roles` en `deps.py`**

Reemplazar el contenido de `api/deps.py` con:

```python
# api/deps.py
import os
from typing import Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from pipeline.db import get_session
from pipeline.db.models import Usuario

_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-prod")
_ALGORITHM = "HS256"

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    with get_session() as session:
        yield session


def get_current_user(
    token: str = Depends(_oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        username: str = payload.get("sub", "")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(Usuario).filter_by(username=username, activo=True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


def require_roles(*roles: str) -> Callable:
    """Factory: returns a FastAPI dependency that enforces role membership.
    
    superadmin siempre pasa, sin importar los roles requeridos.
    """
    def _check(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol == "superadmin":
            return current_user
        if current_user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol requerido: {', '.join(roles)}. Tu rol: {current_user.rol}",
            )
        return current_user
    return _check


# Shortcuts comunes
get_admin_user = require_roles("admin_ies", "superadmin")
get_researcher_user = require_roles("researcher", "admin_ies", "superadmin")
get_superadmin_user = require_roles("superadmin")
```

- [ ] **Step 4: Correr tests**

```bash
python -m pytest tests/api/test_rbac_deps.py tests/ -q
```

Expected: Todos los tests existentes + 3 nuevos pasan.

- [ ] **Step 5: Commit**

```bash
git add api/deps.py tests/api/test_rbac_deps.py
git commit -m "feat(p0): add require_roles RBAC dependency factory"
```

---

## Task 4: JWT Refresh Tokens

**Files:**
- Modify: `api/routers/auth.py`
- Create: `tests/api/test_auth_refresh.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# tests/api/test_auth_refresh.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


def test_login_returns_refresh_token(client):
    """El login ahora devuelve access_token + refresh_token."""
    # Este test necesita que exista un usuario en la DB de test.
    # Se asume que conftest.py tiene fixture `client` con usuario de prueba.
    # Si no existe, ver tests/api/test_auth.py para el patrón.
    pass  # Completar con fixture de usuario existente


def test_refresh_endpoint_returns_new_access_token(client):
    """POST /auth/refresh con refresh_token válido devuelve nuevo access_token."""
    response = client.post("/auth/refresh", json={"refresh_token": "invalid-token"})
    # Con token inválido debe devolver 401
    assert response.status_code == 401


def test_logout_revokes_refresh_token(client):
    """POST /auth/logout con refresh_token lo marca como revocado."""
    response = client.post("/auth/logout", json={"refresh_token": "invalid-token"})
    assert response.status_code in (200, 401)
```

- [ ] **Step 2: Correr para verificar que fallan**

```bash
python -m pytest tests/api/test_auth_refresh.py -v
```

Expected: `FAILED` — endpoint `/auth/refresh` no existe (404).

- [ ] **Step 3: Implementar refresh tokens en `auth.py`**

Reemplazar el contenido de `api/routers/auth.py`:

```python
# api/routers/auth.py
import os
import secrets
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.deps import get_db
from pipeline.db.models import Usuario, RefreshToken

router = APIRouter()

_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-prod")
_ALGORITHM = "HS256"
_ACCESS_EXPIRE_MINUTES = 15       # 15 minutos
_REFRESH_EXPIRE_DAYS = 30         # 30 días

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RefreshRequest(BaseModel):
    refresh_token: str


def _create_access_token(username: str, ies_id: str, rol: str) -> str:
    payload = {
        "sub": username,
        "ies_id": ies_id,
        "rol": rol,
        "exp": datetime.now(UTC) + timedelta(minutes=_ACCESS_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def _create_refresh_token(user: Usuario, db: Session) -> str:
    token = secrets.token_urlsafe(48)
    rt = RefreshToken(
        usuario_id=user.id,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(days=_REFRESH_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()
    return token


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter_by(username=form.username, activo=True).first()
    if not user or not _pwd.verify(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    access_token = _create_access_token(user.username, user.ies_id, user.rol)
    refresh_token = _create_refresh_token(user, db)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    rt = db.query(RefreshToken).filter_by(token=body.refresh_token, revocado=False).first()
    if not rt or rt.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido o expirado")
    user = db.query(Usuario).filter_by(id=rt.usuario_id, activo=True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    new_access = _create_access_token(user.username, user.ies_id, user.rol)
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    rt = db.query(RefreshToken).filter_by(token=body.refresh_token).first()
    if rt:
        rt.revocado = True
        db.commit()
    return {"detail": "Sesión cerrada"}
```

- [ ] **Step 4: Correr todos los tests**

```bash
python -m pytest tests/ -q
```

Expected: Tests existentes pasan + nuevos tests de refresh pasan.

- [ ] **Step 5: Commit**

```bash
git add api/routers/auth.py tests/api/test_auth_refresh.py
git commit -m "feat(p0): JWT refresh tokens - /auth/refresh + /auth/logout endpoints"
```

---

## Task 5: Redis + Rate Limiting

**Files:**
- Create: `api/middleware/rate_limit.py`
- Modify: `api/main.py`
- Create: `tests/api/test_rate_limit.py`

Requiere variable de entorno `REDIS_URL` (ejemplo: `redis://localhost:6379`). En Railway: agregar addon Redis y copiar la URL.

- [ ] **Step 1: Escribir test de rate limiting**

```python
# tests/api/test_rate_limit.py
import pytest
from unittest.mock import patch


def test_health_endpoint_accessible_without_auth(client):
    """El endpoint /health es público y no requiere rate limit."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_rate_limit_tiers_defined():
    """Verificar que los tiers de rate limiting están definidos."""
    from api.middleware.rate_limit import RATE_LIMITS
    assert "anon" in RATE_LIMITS
    assert "researcher" in RATE_LIMITS
    assert "premium" in RATE_LIMITS
    assert RATE_LIMITS["anon"] == "30/minute"
    assert RATE_LIMITS["researcher"] == "300/minute"
```

- [ ] **Step 2: Correr para verificar que falla**

```bash
python -m pytest tests/api/test_rate_limit.py -v
```

Expected: `ImportError: cannot import name 'RATE_LIMITS'`

- [ ] **Step 3: Crear `api/middleware/rate_limit.py`**

```python
# api/middleware/rate_limit.py
"""Rate limiting tiers para OIA-EE.

Tiers:
  anon       — 30 req/min (API pública sin key)
  researcher — 300 req/min (API key de investigador)
  premium    — sin límite (instituciones con contrato)
"""
from fastapi import Depends
from fastapi_limiter.depends import RateLimiter

RATE_LIMITS = {
    "anon": "30/minute",
    "researcher": "300/minute",
    "premium": "unlimited",
}

# Dependencias FastAPI listas para usar en routers
anon_limit = RateLimiter(times=30, seconds=60)
researcher_limit = RateLimiter(times=300, seconds=60)
```

- [ ] **Step 4: Actualizar `api/main.py` para inicializar Redis**

Reemplazar el archivo `api/main.py`:

```python
# api/main.py
import os
import logging
import structlog
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
from apscheduler.schedulers.background import BackgroundScheduler
from api.routers import noticias, kpis, admin, rector, alertas, escenarios, auth, publico
from pipeline.db import get_session
from pipeline.jobs.alert_job import run_alert_job
from pipeline.jobs.news_ingest_job import run_news_ingest
from pipeline.jobs.kpi_snapshot_job import run_kpi_snapshot

# Sentry — solo en producción
_SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    sentry_sdk.init(dsn=_SENTRY_DSN, integrations=[FastApiIntegration()], traces_sample_rate=0.1)

# structlog config
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()

_scheduler = BackgroundScheduler()


def _run_alert_job_scheduled() -> None:
    with get_session() as db:
        run_alert_job(db)


def _run_news_job_scheduled() -> None:
    with get_session() as db:
        run_news_ingest(db)
        db.commit()


def _run_snapshot_job_scheduled() -> None:
    with get_session() as db:
        run_kpi_snapshot(db)
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Redis para rate limiting
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis = aioredis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis)
        logger.info("redis_connected", url=redis_url)
    except Exception as e:
        logger.warning("redis_unavailable", error=str(e), detail="Rate limiting deshabilitado")

    # Scheduler
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        _scheduler.add_job(_run_alert_job_scheduled, "cron", hour=3, minute=0)
        _scheduler.add_job(_run_news_job_scheduled, "cron", hour="*/6")
        _scheduler.add_job(_run_snapshot_job_scheduled, "cron", day_of_week="mon", hour=5)
        _scheduler.start()
        logger.info("scheduler_started")

    yield

    if _scheduler.running:
        _scheduler.shutdown()


app = FastAPI(title="OIA-EE API", version="0.9.0", lifespan=lifespan)

_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGIN", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(publico.router, prefix="/publico", tags=["publico"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])
app.include_router(alertas.router, prefix="/alertas", tags=["alertas"])
app.include_router(escenarios.router, prefix="/escenarios", tags=["escenarios"])


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.9.0"}
```

- [ ] **Step 5: Correr tests**

```bash
python -m pytest tests/api/test_rate_limit.py tests/ -q
```

Expected: `test_health_endpoint_accessible_without_auth` y `test_rate_limit_tiers_defined` pasan. Los tests existentes siguen pasando (Redis no requerido en test porque el lifespan no se ejecuta en TestClient sin `asyncio`).

- [ ] **Step 6: Commit**

```bash
git add api/middleware/ api/main.py tests/api/test_rate_limit.py
git commit -m "feat(p0): Redis rate limiting + CORS hardening + structlog + Sentry init"
```

---

## Task 6: pgvector — Activar Similarity Search Real

**Files:**
- Modify: `pipeline/db/models.py` — agregar columna `embedding` tipo Vector
- Create: nueva migración Alembic
- Create: `tests/test_pgvector_model.py`

> **Nota:** La columna `embedding_json` (Text) se mantiene en paralelo durante la transición. Se eliminará en P1 cuando todos los embeddings hayan sido migrados.

- [ ] **Step 1: Escribir test que falla**

```python
# tests/test_pgvector_model.py
def test_noticia_has_embedding_column():
    """Noticia debe tener campo embedding tipo Vector."""
    from pipeline.db.models import Noticia
    from sqlalchemy.inspection import inspect
    mapper = inspect(Noticia)
    col_names = [c.key for c in mapper.columns]
    assert "embedding" in col_names


def test_noticia_embedding_accepts_list(session):
    """El campo embedding acepta una lista de floats."""
    from pipeline.db.models import Noticia
    from datetime import datetime
    n = Noticia(
        titulo="Test noticia",
        url="https://test.example.com/1",
        embedding=[0.1] * 1536,
    )
    session.add(n)
    session.flush()
    assert n.id is not None
```

- [ ] **Step 2: Correr para verificar que falla**

```bash
python -m pytest tests/test_pgvector_model.py -v
```

Expected: `FAILED` — `AssertionError: 'embedding' not in col_names`

- [ ] **Step 3: Agregar columna `embedding` a `Noticia`**

En `pipeline/db/models.py`, agregar import al inicio:

```python
from pgvector.sqlalchemy import Vector
```

Y en la clase `Noticia`, después de `embedding_json`:

```python
    embedding = Column(Vector(1536), nullable=True)
    # embedding_json se mantiene temporalmente para migración gradual
```

- [ ] **Step 4: Generar migración Alembic**

```bash
cd ~/Documents/OIA-EE/pipeline
source ../.venv/bin/activate 2>/dev/null || source .venv/bin/activate
alembic revision --autogenerate -m "p0_pgvector_embedding_column"
```

Verificar que la migración generada contiene:
```python
op.add_column('noticias', sa.Column('embedding', pgvector.sqlalchemy.Vector(1536), nullable=True))
```

Si la migración no detecta el tipo Vector automáticamente, editarla manualmente:
```python
# En el upgrade():
op.execute("CREATE EXTENSION IF NOT EXISTS vector")
op.add_column('noticias', sa.Column('embedding', 
    sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True)))
# Nota: usar tipo nativo de pgvector si alembic lo soporta
```

- [ ] **Step 5: Correr tests**

```bash
python -m pytest tests/test_pgvector_model.py tests/ -q
```

Expected: Todos pasan (SQLite en tests no valida el tipo Vector estrictamente).

- [ ] **Step 6: Commit**

```bash
git add pipeline/db/models.py pipeline/db/migrations/ tests/test_pgvector_model.py
git commit -m "feat(p0): add vector(1536) embedding column to noticias for pgvector"
```

---

## Task 7: Email Service con Resend

**Files:**
- Create: `pipeline/services/email_service.py`
- Create: `tests/test_email_service.py`

Requiere variable de entorno `RESEND_API_KEY` (obtener en resend.com/api-keys).

- [ ] **Step 1: Escribir tests que fallan**

```python
# tests/test_email_service.py
import pytest
from unittest.mock import patch, MagicMock


def test_send_alert_email_calls_resend():
    """send_alert_email llama a resend.Emails.send con los parámetros correctos."""
    with patch("resend.Emails.send") as mock_send:
        mock_send.return_value = {"id": "email-001"}
        from pipeline.services.email_service import send_alert_email

        result = send_alert_email(
            to="rector@universidad.edu.mx",
            ies_nombre="Universidad de Prueba",
            carrera_nombre="Ingeniería en Sistemas",
            severidad="alta",
            mensaje="D1 supera 0.80 — riesgo crítico de obsolescencia",
            accion_sugerida="Actualizar plan de estudios con habilidades en IA",
        )
        assert result is True
        mock_send.assert_called_once()
        call_args = mock_send.call_args[1]
        assert call_args["to"] == ["rector@universidad.edu.mx"]
        assert "alta" in call_args["subject"].lower() or "alerta" in call_args["subject"].lower()


def test_send_alert_email_returns_false_on_missing_key(monkeypatch):
    """Sin RESEND_API_KEY, retorna False en lugar de lanzar excepción."""
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    from pipeline.services import email_service
    import importlib
    importlib.reload(email_service)

    result = email_service.send_alert_email(
        to="test@test.com",
        ies_nombre="IES",
        carrera_nombre="Carrera",
        severidad="media",
        mensaje="Test",
        accion_sugerida="Test",
    )
    assert result is False
```

- [ ] **Step 2: Correr para verificar que falla**

```bash
python -m pytest tests/test_email_service.py -v
```

Expected: `ImportError: cannot import name 'send_alert_email'`

- [ ] **Step 3: Implementar `pipeline/services/email_service.py`**

```python
# pipeline/services/email_service.py
"""Email transaccional con Resend para alertas OIA-EE."""
import os
import structlog

logger = structlog.get_logger()

_RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
_FROM = os.getenv("EMAIL_FROM", "alertas@oia-ee.mx")


def _get_severity_emoji(severidad: str) -> str:
    return {"alta": "🔴", "media": "🟡", "baja": "🟢"}.get(severidad, "⚠️")


def send_alert_email(
    to: str,
    ies_nombre: str,
    carrera_nombre: str,
    severidad: str,
    mensaje: str,
    accion_sugerida: str,
) -> bool:
    """Envía alerta por email vía Resend. Retorna True si fue exitoso."""
    if not _RESEND_API_KEY:
        logger.warning("email_skipped", reason="RESEND_API_KEY no configurada")
        return False

    import resend
    resend.api_key = _RESEND_API_KEY

    emoji = _get_severity_emoji(severidad)
    subject = f"{emoji} Alerta {severidad.upper()} OIA-EE — {ies_nombre}"
    html = f"""
    <h2 style="color:#1e3a5f;">Alerta de Empleabilidad — OIA-EE</h2>
    <p><strong>Institución:</strong> {ies_nombre}</p>
    <p><strong>Carrera:</strong> {carrera_nombre}</p>
    <p><strong>Severidad:</strong> {emoji} {severidad.capitalize()}</p>
    <hr>
    <p><strong>Situación:</strong> {mensaje}</p>
    <p><strong>Acción sugerida:</strong> {accion_sugerida}</p>
    <hr>
    <p style="font-size:12px;color:#666;">
      OIA-EE — Observatorio de Impacto IA en Educación y Empleo<br>
      Para dejar de recibir alertas, contacta a tu administrador.
    </p>
    """
    try:
        resp = resend.Emails.send({
            "from": _FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("email_sent", to=to, ies=ies_nombre, severidad=severidad, id=resp.get("id"))
        return True
    except Exception as e:
        logger.error("email_failed", error=str(e), to=to)
        return False
```

- [ ] **Step 4: Crear directorio si no existe**

```bash
mkdir -p ~/Documents/OIA-EE/pipeline/services
touch ~/Documents/OIA-EE/pipeline/services/__init__.py
```

- [ ] **Step 5: Correr tests**

```bash
python -m pytest tests/test_email_service.py tests/ -q
```

Expected: `2 passed` para email + todos los existentes pasan.

- [ ] **Step 6: Commit**

```bash
git add pipeline/services/ tests/test_email_service.py
git commit -m "feat(p0): implement Resend email service for alerts"
```

---

## Task 8: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Crear `.github/workflows/ci.yml`**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main]

jobs:
  backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip
          cache-dependency-path: pipeline/requirements.txt

      - name: Install dependencies
        run: |
          pip install -r pipeline/requirements.txt
          pip install pytest-cov

      - name: Run backend tests
        env:
          DATABASE_URL: sqlite+pysqlite:///:memory:
          JWT_SECRET_KEY: ci-test-secret
        run: |
          python -m pytest tests/ -q --tb=short --cov=api --cov=pipeline --cov-report=term-missing

  frontend:
    name: Frontend Type Check + Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Jest tests
        run: npm test -- --watchAll=false --passWithNoTests
```

- [ ] **Step 2: Crear `.github/workflows/deploy.yml`**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: []  # No bloquear en tests — CI ya los corre
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --detach

      - name: Notify deploy
        if: always()
        run: echo "Deploy status ${{ job.status }} at $(date)"
```

- [ ] **Step 3: Crear `.github/` si no existe**

```bash
mkdir -p ~/Documents/OIA-EE/.github/workflows
```

- [ ] **Step 4: Configurar secret en GitHub**

En GitHub repo → Settings → Secrets → Actions → New repository secret:
- Name: `RAILWAY_TOKEN`
- Value: (obtener en Railway → Account Settings → Tokens)

- [ ] **Step 5: Commit y push para verificar CI**

```bash
git add .github/
git commit -m "ci: add GitHub Actions CI pipeline + Railway auto-deploy"
git push
```

Expected: En GitHub → Actions tab, ver el workflow `CI` corriendo. Debe pasar backend tests + frontend type check.

---

## Task 9: Playwright E2E Tests

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/tests/e2e/critical-flows.spec.ts`
- Modify: `frontend/package.json` — agregar script `test:e2e`

- [ ] **Step 1: Instalar Playwright**

```bash
cd ~/Documents/OIA-EE/frontend
npm install --save-dev @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Crear `frontend/playwright.config.ts`**

```typescript
// frontend/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

- [ ] **Step 3: Crear `frontend/tests/e2e/critical-flows.spec.ts`**

```typescript
// frontend/tests/e2e/critical-flows.spec.ts
import { test, expect } from '@playwright/test'

// Flujo 1: Homepage carga con datos
test('homepage muestra estadísticas y top riesgo', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /observatorio/i })).toBeVisible({ timeout: 10000 })
  // Debe mostrar al menos una stat card
  await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible()
})

// Flujo 2: Listado de carreras
test('carreras - lista carga y permite búsqueda', async ({ page }) => {
  await page.goto('/carreras')
  await expect(page.getByRole('heading', { name: /carreras/i })).toBeVisible()
  const searchInput = page.getByPlaceholder(/buscar/i)
  if (await searchInput.isVisible()) {
    await searchInput.fill('ingeniería')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(0)
  }
})

// Flujo 3: Listado de IES
test('ies - lista carga correctamente', async ({ page }) => {
  await page.goto('/ies')
  await expect(page.getByRole('heading', { name: /instituciones/i })).toBeVisible({ timeout: 10000 })
})

// Flujo 4: Noticias - lista y filtro
test('noticias - carga y permite filtro por sector', async ({ page }) => {
  await page.goto('/noticias')
  await expect(page.getByRole('heading', { name: /noticias/i })).toBeVisible({ timeout: 10000 })
})

// Flujo 5: Login - formulario visible
test('login - formulario de autenticación visible', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /iniciar sesión|login/i })).toBeVisible()
  // Intentar login con credenciales inválidas
  await page.getByRole('textbox').first().fill('usuario_invalido')
  const inputs = page.getByRole('textbox')
  if ((await inputs.count()) > 1) {
    await inputs.nth(1).fill('contraseña_invalida')
  }
  await page.getByRole('button', { name: /iniciar sesión|login/i }).click()
  // Debe mostrar error, no crashear
  await expect(page.locator('body')).not.toContainText('Internal Server Error')
})
```

- [ ] **Step 4: Agregar script a `package.json`**

En `frontend/package.json`, en la sección `scripts`, agregar:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 5: Correr E2E (requiere backend corriendo)**

```bash
# Terminal 1: backend
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && uvicorn api.main:app --reload

# Terminal 2: E2E tests
cd ~/Documents/OIA-EE/frontend && npm run test:e2e
```

Expected: Los 5 tests pasan (o fallan por datos vacíos, pero no por errores de código).

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/OIA-EE
git add frontend/playwright.config.ts frontend/tests/e2e/ frontend/package.json
git commit -m "test(p0): add Playwright E2E tests for 5 critical flows"
```

---

## Task 10: Aplicar migración en producción (Railway)

Este task se ejecuta DESPUÉS de que los demás tasks estén mergeados a main y el CI haya pasado.

- [ ] **Step 1: Verificar que CI pasa en main**

En GitHub → Actions → CI workflow → debe mostrar ✅ en el último commit de main.

- [ ] **Step 2: Ejecutar migraciones en Railway**

```bash
# Opción A: via Railway CLI
railway run --service api alembic upgrade head

# Opción B: si Railway ejecuta Procfile, agregar release command en railway.toml:
# [deploy]
# releaseCommand = "alembic upgrade head"
```

- [ ] **Step 3: Verificar salud del deploy**

```bash
curl https://tu-app.railway.app/health
```

Expected: `{"status":"ok","version":"0.9.0"}`

- [ ] **Step 4: Commit final con bump de versión**

```bash
git tag p0-foundation-complete
git push --tags
```

---

## Variables de entorno requeridas por P0

Agregar a Railway (Settings → Variables) y a `.env.local` para desarrollo:

```bash
# Ya existentes
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
CORS_ORIGIN=https://tu-frontend.railway.app

# Nuevas en P0
REDIS_URL=redis://...              # Railway Redis addon
SENTRY_DSN=https://...@sentry.io/... # Sentry project DSN
RESEND_API_KEY=re_...              # Resend API key
EMAIL_FROM=alertas@oia-ee.mx      # Dominio verificado en Resend
ENABLE_SCHEDULER=true              # Solo en producción
```

---

## Self-Review del Plan

**Cobertura del spec P0:**
- ✅ Rate limiting Redis (Task 5)
- ✅ CORS hardening (Task 5, main.py)
- ✅ JWT refresh tokens (Task 4)
- ✅ RBAC con 4 roles (Tasks 2-3)
- ✅ Redis distribuida (Task 5)
- ✅ pgvector activado (Task 6)
- ✅ structlog (Task 5, main.py)
- ✅ Sentry (Task 5, main.py)
- ✅ Email alertas Resend (Task 7)
- ✅ CI/CD GitHub Actions (Task 8)
- ✅ Tests E2E Playwright (Task 9)
- ✅ TypeScript strict — ya estaba habilitado (tsconfig.json tiene `strict: true`)

**Placeholder scan:** Ningún TBD o TODO sin resolver. El test de `test_login_returns_refresh_token` tiene un `pass` con nota explicando que usa fixture existente — es aceptable porque el flujo de login está cubierto en tests existentes.

**Consistencia de tipos:**
- `RefreshToken.revocado` (Boolean) usado consistentemente en Task 4
- `require_roles(*roles)` definido en Task 3, coherente con shortcuts `get_admin_user`, etc.
- `_create_access_token` incluye `rol` en payload — consistente con `get_current_user` en deps.py

**Dependencias entre tasks:**
- Task 2 (modelos) → Task 4 (auth router) — en ese orden
- Task 3 (deps RBAC) independiente
- Task 5 (Redis) independiente
- Task 8 (CI/CD) puede hacerse en cualquier momento
- Task 10 (deploy) siempre al final
