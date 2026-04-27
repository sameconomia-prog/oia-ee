# P3 — API Pública: Diseño

**Fecha:** 2026-04-27  
**Estado:** Aprobado  
**Scope:** Rate limiting por tiers, API keys gestionadas por admin, documentación OpenAPI enriquecida para endpoints `/publico/*`

---

## Contexto

El proyecto ya tiene:
- Endpoints públicos bajo `/publico/*` (sin autenticación)
- `fastapi_limiter` con Redis instalado y tres tiers definidos (`anon`/`researcher`/`premium`) en `api/middleware/rate_limit.py` — pero **no aplicados** a ningún endpoint
- Redis con graceful degradation en `api/main.py` (si no hay `REDIS_URL`, rate limiting se deshabilita sin crash)

P3 activa ese mecanismo dormido, añade API keys para tiers superiores, y enriquece la documentación OpenAPI.

---

## Flujo de datos

```
Cliente → GET /publico/carreras
  Header: X-API-Key: sk_oa_ab12cd34...   (opcional)
    ↓
  dependency get_api_key_tier(request)
    → hash key → busca api_key tabla
    → valida: no revocada, no expirada
    → retorna tier: "researcher"
    ↓
  dynamic_rate_limiter("researcher") → 300 req/min
    ↓
  endpoint handler → respuesta JSON
```

Sin header `X-API-Key` → tier `anon` → 30 req/min.  
Sin Redis → rate limiting deshabilitado, API funciona igual que hoy.

---

## Modelo de base de datos

### Tabla `api_key`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `key_hash` | VARCHAR(64) | SHA-256 de la raw key — nunca en claro |
| `key_prefix` | VARCHAR(8) | Primeros 8 chars para display (`sk_oa_ab12`) |
| `name` | VARCHAR(200) | Label descriptivo ("UNAM Investigador") |
| `email` | VARCHAR(200) | Contacto del titular |
| `tier` | VARCHAR(20) | `"anon"` / `"researcher"` / `"premium"` |
| `expires_at` | DATE nullable | Null = sin expiración |
| `revoked` | BOOLEAN | False por defecto; True = revocada |
| `created_at` | DATETIME | Automático |

**Constraint único:** `key_hash` — una key no puede duplicarse.

**Migración Alembic:** `p3apikey001` — `down_revision = 'p2enoe001'`

---

## Componentes

### 1. `pipeline/db/models_apikey.py` (nuevo)

Modelo SQLAlchemy `ApiKey` con los campos de la tabla. `UniqueConstraint` en `key_hash`. `Index` en `key_hash` para lookups rápidos.

### 2. Migración `p3apikey001` (nuevo)

Crea tabla `api_key` con constraint e índice. `down_revision = 'p2enoe001'`.

### 3. `api/deps.py` (modificar)

Agregar dependency `get_api_key_tier(request: Request, session: Session) -> str`:
- Lee header `X-API-Key`
- Si ausente → retorna `"anon"`
- Hash SHA-256 del valor → busca en `ApiKey` por `key_hash`
- Si no encontrada → retorna `"anon"`
- Si `revoked=True` → retorna `"anon"` (no expone que existe la key)
- Si `expires_at` no null y ya venció → retorna `"anon"`
- Si válida → retorna `key.tier`

### 4. `api/middleware/rate_limit.py` (modificar)

Agregar función `dynamic_rate_limiter(tier: str) -> Callable`:
- `"premium"` → retorna dependency vacía (sin límite)
- `"researcher"` → retorna `RateLimiter(times=300, seconds=60)`
- cualquier otro → retorna `RateLimiter(times=30, seconds=60)`

Si `FastAPILimiter` no fue inicializado (sin Redis) → retorna dependency vacía (graceful degradation).

### 5. `api/routers/api_keys.py` (nuevo)

Endpoints admin protegidos con `require_roles(["superadmin"])`:

```
POST   /admin/api-keys          → crear key
GET    /admin/api-keys          → listar keys
DELETE /admin/api-keys/{id}     → revocar key
```

**POST /admin/api-keys** — body: `{name, email, tier, expires_at?}`
- Genera 32 bytes random → prefijo `sk_oa_` + hex → raw_key
- Guarda `key_hash = SHA-256(raw_key)`, `key_prefix = raw_key[:8]`
- Retorna `{id, raw_key, key_prefix, name, email, tier, expires_at}` — `raw_key` solo esta vez

**GET /admin/api-keys** — retorna lista: `{id, key_prefix, name, email, tier, expires_at, revoked, created_at}` (sin hash)

**DELETE /admin/api-keys/{id}** — sets `revoked=True`, retorna `{id, revoked: true}`

### 6. `api/routers/publico.py` (modificar)

Para cada endpoint:
- Agregar `dependencies=[Depends(get_api_key_tier)]` + `dynamic_rate_limiter(tier)` — via dependency combinada
- Agregar `summary`, `description`, y `responses={200: {"content": {"application/json": {"example": ...}}}}` con ejemplo real

Patrón por endpoint:
```python
@router.get(
    "/carreras",
    summary="Buscar carreras universitarias",
    description="Retorna carreras activas con KPIs D1/D2/D3/D6. ...",
    responses={200: {"content": {"application/json": {"example": {...}}}}},
    dependencies=[Depends(rate_limit_public)],
)
```

Donde `rate_limit_public` es una dependency que llama `get_api_key_tier` + `dynamic_rate_limiter`.

### 7. `api/main.py` (modificar)

- Agregar metadata: `description`, `contact`, `license_info`
- Registrar security scheme `APIKeyHeader` con nombre `X-API-Key`
- Incluir router `api_keys` bajo prefix `/admin`
- Importar `models_apikey` en `conftest.py` y `migrations/env.py`

### 8. `tests/conftest.py` + `pipeline/db/migrations/env.py` (modificar)

Importar `models_apikey` para que `Base.metadata.create_all` incluya la tabla.

---

## Rate limit dependency pattern

```python
# api/deps.py
async def rate_limit_public(
    request: Request,
    session: Session = Depends(get_db),
):
    tier = await get_api_key_tier(request, session)
    limiter = dynamic_rate_limiter(tier)
    if limiter:
        await limiter(request)
```

Cada endpoint público recibe `dependencies=[Depends(rate_limit_public)]`.

---

## Tests

### `tests/api/test_api_keys.py` (nuevo)
- Test: crear key → retorna raw_key con prefijo `sk_oa_`
- Test: listar keys → no incluye raw_key ni hash
- Test: revocar key → revoked=True
- Test: solo superadmin puede gestionar keys (403 para otros roles)

### `tests/api/test_rate_limit.py` (nuevo)
- Test: sin API key → tier `anon` (mock limiter)
- Test: con API key válida researcher → tier `researcher`
- Test: con API key revocada → tier `anon`
- Test: con API key expirada → tier `anon`

### `tests/test_migrations.py` (existente)
- El test de migraciones ya cubre `p3apikey001` automáticamente.

---

## OpenAPI — endpoints a documentar

Todos los endpoints en `api/routers/publico.py`:

| Endpoint | Summary | Ejemplo respuesta |
|----------|---------|-------------------|
| `GET /publico/resumen` | Resumen del observatorio | `{ies: 150, carreras: 800, ...}` |
| `GET /publico/carreras` | Buscar carreras | `[{id, nombre, d1, d2, ...}]` |
| `GET /publico/carreras/areas` | Áreas de conocimiento | `["Ingeniería", "Salud", ...]` |
| `GET /publico/kpis/resumen` | KPIs nacionales promedio | `{d1_promedio: 0.42, ...}` |
| `GET /publico/estadisticas` | Estadísticas globales | `{top_skills: [...], ...}` |
| `GET /publico/vacantes` | Buscar vacantes IA | `[{id, titulo, empresa, ...}]` |
| `GET /publico/vacantes/tendencia` | Tendencia mensual vacantes | `[{mes: "2025-01", count: 42}]` |
| `GET /publico/vacantes/skills` | Top skills en vacantes | `[{skill: "Python", freq: 120}]` |
| `GET /publico/vacantes/{id}` | Detalle de vacante | `{id, titulo, skills, ...}` |

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `REDIS_URL` | Sí (para rate limiting real) | `redis://localhost:6379`. Sin ella, rate limiting deshabilitado. |

**Acción Railway:** añadir servicio Redis → variable `REDIS_URL` autoconfigurada.

---

## Fuera de scope

- No se documentan endpoints privados (auth, rector, admin, radar, predicciones)
- No hay auto-servicio de API keys (solo admin crea/revoca)
- No hay dashboard de uso por key
- No hay webhooks ni SDK cliente
- No se modifica el sistema JWT existente
