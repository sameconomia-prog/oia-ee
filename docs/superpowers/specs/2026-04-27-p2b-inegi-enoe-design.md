# P2B — INEGI ENOE: Diseño

**Fecha:** 2026-04-27  
**Estado:** Aprobado  
**Scope:** Integrar API BIE del INEGI (ENOE) para enriquecer D5 con empleo total (formal+informal) y D3 con contexto macro de desempleo nacional

---

## Contexto

P2A integró IMSS para dar empleo formal por estado en D5 (`calcular_ies_s()`). Sin embargo, el IMSS solo cubre ~45% del mercado laboral mexicano (sector formal). La ENOE del INEGI mide empleo total (formal+informal) vía encuesta trimestral, publicando `tasa_desempleo` y `poblacion_ocupada` por estado.

D3 (`calcular_tdm()`) tampoco considera si el mercado laboral nacional ya está estresado al medir desplazamiento por IA. Un despido en un mercado con 3.5% de desempleo tiene menor impacto que uno con 12%.

---

## Flujo de datos

```
INEGI BIE API (trimestral — ~día 15 post-cierre)
  → enoe_loader.py (descarga + normaliza estados)
  → tabla indicador_enoe (upsert por estado/anio/trimestre)
  → d5_geografia.py calcular_ies_s() usa poblacion_ocupada ENOE primero
  → d3_mercado.py calcular_tdm() usa factor_macro de tasa_desempleo nacional
```

---

## Modelo de base de datos

### Tabla `indicador_enoe`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `estado` | VARCHAR(100) | Nombre estado normalizado (igual que `IES.estado`); `"Nacional"` para promedio nacional |
| `anio` | INTEGER | Año |
| `trimestre` | INTEGER | 1–4 |
| `tasa_desempleo` | FLOAT | Tasa desocupación abierta (%) |
| `poblacion_ocupada` | INTEGER | Población ocupada en miles de personas |
| `fecha_corte` | DATE | Fecha de publicación INEGI |

**Constraint único:** `(estado, anio, trimestre)` — upsert en cada ingesta.

---

## API INEGI BIE

- **URL base:** `https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/{indicator_id}/es/{geo_code}/false/BIE/2.0/{token}.json`
- **Autenticación:** token gratuito vía registro en `https://www.inegi.org.mx/app/desarrolladores/generatoken/`
- **Variable de entorno:** `INEGI_API_TOKEN`
- **Frecuencia publicación:** trimestral (~15 días después del cierre de trimestre)
- **Indicadores a consultar:**
  - Tasa de desocupación abierta por entidad federativa (series BIE por estado)
  - Población ocupada total por entidad federativa (series BIE por estado)
- **Geografías:** código nacional (`0700`) + 32 entidades (`070001`–`070032`)
- **Timeout:** 30s. Si falla → retorna lista vacía, no bloquea scheduler

---

## Componentes

### 1. `pipeline/db/models_enoe.py` (nuevo)

Modelo SQLAlchemy `IndicadorENOE` con los campos de la tabla. `UniqueConstraint` en `(estado, anio, trimestre)`. `Index` en `(estado, anio, trimestre)`.

### 2. Migración Alembic `p2enoe001` (nuevo)

`down_revision = 'p2imss001'`. Crea tabla `indicador_enoe` con constraint e índice.

### 3. `pipeline/loaders/enoe_loader.py` (nuevo)

Función `fetch_enoe_indicadores(anio, trimestre, api_token) -> list[dict]`:
- Lee los indicator IDs desde constantes internas para tasa_desempleo y poblacion_ocupada por estado + nacional
- Llama la API BIE para cada estado (o en batch si la API lo permite)
- Normaliza nombres de estados al catálogo de `IES.estado`
- Retorna lista de dicts con campos del modelo
- Si `api_token` es `None` o vacío → retorna lista vacía con log de warning
- Si la API falla → retorna lista vacía, no lanza excepción

### 4. `pipeline/jobs/enoe_ingest_job.py` (nuevo)

Función `run_enoe_ingest(session, anio=None, trimestre=None) -> dict`:
- Si no se especifican, calcula el trimestre anterior al actual
- Llama `fetch_enoe_indicadores(anio, trimestre, api_token)` con token de `os.getenv("INEGI_API_TOKEN")`
- Upsert: si ya existe `(estado, anio, trimestre)` → actualiza `tasa_desempleo` y `poblacion_ocupada`; si no → inserta
- Retorna `{"procesados": N, "insertados": N, "actualizados": N}`

### 5. `pipeline/scheduler.py` (modificar)

Agregar job trimestral:
```python
scheduler.add_job(
    run_enoe_loader,
    trigger=CronTrigger(month="1,4,7,10", day=20, hour=4, minute=0),
    id="enoe_loader",
    name="Carga INEGI ENOE trimestral",
    replace_existing=True,
)
```

### 6. `pipeline/kpi_engine/d5_geografia.py` (modificar)

Modificar `calcular_ies_s(estado, session)` con tres niveles de fallback:

```
1. IndicadorENOE.poblacion_ocupada * 1000  ← más reciente disponible, trimestral
2. SUM(EmpleoFormalIMSS.trabajadores)      ← P2A, mensual, solo formal
3. COUNT(Vacante.estado)                   ← proxy mínimo original
```

Fórmula sin cambios: `raw = (empleo - despidos_nacionales) / (empleo + despidos_nacionales + 1)`, centrada en `[0,1]`.

### 7. `pipeline/kpi_engine/d3_mercado.py` (modificar)

Agregar función `calcular_factor_macro(session) -> float`:
- Consulta `AVG(tasa_desempleo)` de `IndicadorENOE` para `estado = "Nacional"` del trimestre más reciente
- Si no hay datos → retorna `1.0` (factor neutro, sin cambio en D3)
- Referencia histórica sana: **3.5%** (tasa estructural México)
- `factor = tasa_actual / 3.5` — mercado estresado amplifica riesgo, mercado sano lo amortigua

Modificar `calcular_tdm(carrera_id, session)`:
```python
tdm_raw = despidos / (vacantes + 1)
factor_macro = calcular_factor_macro(session)
return round(min(1.0, tdm_raw * factor_macro), 4)
```

Fallback garantizado: sin datos ENOE → `factor_macro = 1.0` → D3 se comporta igual que hoy.

---

## Tests

### `tests/loaders/test_enoe_loader.py` (nuevo)
- Test: respuesta válida API → lista de dicts con campos correctos (mock httpx)
- Test: API falla (timeout) → lista vacía, sin excepción
- Test: token ausente (`None`) → lista vacía, no llama API

### `tests/jobs/test_enoe_ingest_job.py` (nuevo)
- Test: inserta nuevos registros correctamente
- Test: upsert actualiza tasa_desempleo y poblacion_ocupada si ya existe
- Test: lista vacía no falla (procesados=0)

### `tests/kpi_engine/test_d5_geografia.py` (modificar)
- Test: con datos ENOE y IMSS → usa ENOE (prioridad)
- Test: solo IMSS, sin ENOE → usa IMSS
- Test: sin ninguno → 0.5 (fallback original)

### `tests/kpi_engine/test_d3_mercado.py` (modificar)
- Test: sin datos ENOE → `calcular_factor_macro()` retorna 1.0
- Test: tasa_desempleo=3.5% → factor=1.0
- Test: tasa_desempleo=7.0% → factor=2.0 (capped at 1.0 en TDM)
- Test: TDM se amplifica correctamente con factor > 1.0

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `INEGI_API_TOKEN` | Sí (para datos reales) | Token gratuito BIE INEGI. Sin él, loader retorna lista vacía. |

---

## Fuera de scope

- No se modifica D1, D2, D4, D6, D7
- No se expone endpoint nuevo en la API REST
- No se integra ANUIES ni OCC/Indeed (siguiente sprint)
- No se implementa descarga de microdatos CSV (la API BIE es suficiente)
