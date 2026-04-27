# P2A — IMSS Empleo Formal: Diseño

**Fecha:** 2026-04-26  
**Estado:** Aprobado  
**Scope:** Integrar API pública del IMSS Microscopio Laboral para alimentar D5 con datos reales de empleo formal por estado/sector

---

## Contexto

D5 Geografía actualmente usa `EMPLEO_BASE_DEFAULT = 1_000_000` como proxy de empleo por estado en `calcular_ies_s()`. Esto hace que todos los estados tengan scores poco diferenciados. El IMSS publica mensualmente empleo formal registrado por estado y sector SCIAN vía API REST pública (CKAN) sin autenticación.

---

## Flujo de datos

```
IMSS API CKAN (día 15 cada mes)
  → imss_loader.py (descarga + normaliza estados)
  → tabla empleo_formal_imss (upsert por estado/sector/mes)
  → d5_geografia.py calcular_ies_s() usa datos reales
```

---

## Modelo de base de datos

### Tabla `empleo_formal_imss`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `estado` | VARCHAR(100) | Nombre estado normalizado (igual que `IES.estado`) |
| `sector_scian` | VARCHAR(10) | Código SCIAN |
| `sector_nombre` | VARCHAR(200) | Nombre del sector |
| `anio` | INTEGER | Año del dato |
| `mes` | INTEGER | Mes 1-12 |
| `trabajadores` | INTEGER | Empleos formales registrados |
| `fecha_corte` | DATE | Fecha de publicación IMSS |

**Constraint único:** `(estado, sector_scian, anio, mes)` — upsert en cada ingesta.

---

## Componentes

### 1. `pipeline/db/models_imss.py` (nuevo)

Modelo SQLAlchemy `EmpleoFormalIMSS` con los campos de la tabla. UniqueConstraint en `(estado, sector_scian, anio, mes)`.

### 2. Migración Alembic (nuevo)

Migración `p2imss001` que crea la tabla `empleo_formal_imss`. `down_revision` apunta a la última migración existente (`p1pred001`).

### 3. `pipeline/loaders/imss_loader.py` (nuevo)

Función `fetch_imss_empleo(anio, mes) -> list[dict]`:
- URL base: `https://datos.imss.gob.mx/api/3/action/datastore_search`
- Parámetros: resource_id del dataset de puestos de trabajo por estado y sector
- Normaliza nombres de estados al catálogo usado en `IES.estado` (31 estados + CDMX)
- Retorna lista de dicts con campos del modelo
- Timeout 30s, manejo de errores con structlog
- Si la API no responde: retorna lista vacía (no bloquea el scheduler)

### 4. `pipeline/jobs/imss_ingest_job.py` (nuevo)

Función `run_imss_ingest(session) -> dict`:
- Calcula `anio` y `mes` del mes anterior (el más reciente publicado)
- Llama `fetch_imss_empleo(anio, mes)`
- Upsert: si ya existe el registro `(estado, sector_scian, anio, mes)` → actualiza `trabajadores`; si no → inserta
- Retorna `{"procesados": N, "insertados": N, "actualizados": N}`

### 5. `pipeline/scheduler.py` (modificar)

Agregar job:
```python
scheduler.add_job(
    run_imss_loader,
    trigger=CronTrigger(day=15, hour=3, minute=0),
    id="imss_loader",
    name="Carga IMSS empleo formal mensual",
    replace_existing=True,
)
```

### 6. `pipeline/kpi_engine/d5_geografia.py` (modificar)

Modificar `calcular_ies_s(estado, session)`:
- Buscar `SUM(trabajadores)` en `EmpleoFormalIMSS` para el estado y el mes más reciente disponible
- Si hay datos IMSS → usar esa suma como denominador real
- Si no hay datos IMSS → mantener fallback actual con `Vacante.estado` count + `EMPLEO_BASE_DEFAULT`

---

## Tests

### `tests/loaders/test_imss_loader.py` (nuevo)
- Test: respuesta válida de API → retorna lista de dicts con campos correctos (mock httpx)
- Test: API falla (timeout) → retorna lista vacía, no lanza excepción
- Test: normalización de nombres de estados (e.g. "Ciudad de México" → "CDMX" o el formato de `IES.estado`)

### `tests/jobs/test_imss_ingest_job.py` (nuevo)
- Test: inserta nuevos registros correctamente
- Test: upsert actualiza `trabajadores` si el registro ya existe

---

## Variables de entorno

Ninguna — la API del IMSS es completamente pública, sin autenticación.

---

## Fuera de scope

- No se modifica D3 (requiere análisis separado)
- No se hace cambio en frontend (D5 ya se muestra, solo mejoran sus valores)
- No se integra INEGI ENOE (siguiente sprint P2B)
- No se expone endpoint nuevo en la API REST
