# OIA-EE Sprint 3 — Design Spec: GDELT Loader + Enriquecimiento

**Fecha:** 2026-04-21
**Estado:** Aprobado
**Objetivo:** Scraper GDELT DOC API con pipeline completo fetch→store→classify→embed, disparado manualmente vía CLI o endpoint de admin.

---

## Arquitectura

Sprint 3 añade 3 módulos sobre la base de Sprint 2:

```
pipeline/scrapers/gdelt_scraper.py   → GdeltScraper (extiende BaseScraper)
pipeline/ingest_gdelt.py             → run_gdelt_pipeline() — orquesta fetch→store→classify→embed
api/routers/admin.py                 → POST /admin/ingest/gdelt — trigger manual
```

No hay cambios de schema. Usa modelos, ClaudeClient y embed_text del Sprint 1/2.

---

## GdeltScraper

**Archivo:** `pipeline/scrapers/gdelt_scraper.py`

Extiende `BaseScraper`. Consulta GDELT DOC API por cada query y devuelve `list[RawArticle]`.

**API URL:**
```
https://api.gdeltproject.org/api/v2/doc/doc?query={q}&mode=ArtList&maxrecords=250&format=json
```

Sin autenticación. Sin filtro de idioma (cobertura global con énfasis en español + inglés vía las queries).

**6 queries por defecto:**
```python
DEFAULT_QUERIES = [
    "inteligencia artificial empleo",
    "AI jobs education",
    "automatización trabajo",
    "machine learning workforce",
    "IA educación México",
    "artificial intelligence employment",
]
```

**Respuesta GDELT** (campo relevante):
```json
{
  "articles": [
    {"title": "...", "url": "...", "seendate": "20240415T120000Z", "language": "Spanish", "sourcecountry": "Mexico"}
  ]
}
```

**Deduplicación:** por URL antes de devolver — si dos queries producen el mismo artículo, solo se incluye una vez.

**Rate limiting:** `TokenBucket(rate=1.0, capacity=1.0)` — 1 req/seg.

**`RawArticle` mapeado desde GDELT:**
- `titulo` ← `article["title"]`
- `url` ← `article["url"]`
- `fuente` ← `"gdelt"`
- `contenido` ← `""` (GDELT no entrega texto completo, solo metadatos)
- `fecha_pub` ← `article["seendate"]` parseado a datetime (`"%Y%m%dT%H%M%SZ"`)
- `pais` ← `article.get("sourcecountry", "global")`

---

## Pipeline de Enriquecimiento

**Archivo:** `pipeline/ingest_gdelt.py`

```python
@dataclass
class IngestResult:
    fetched: int
    stored: int
    classified: int
    embedded: int

def run_gdelt_pipeline(
    session: Session,
    api_key_claude: str,
    api_key_voyage: str,
    queries: list[str] = DEFAULT_QUERIES,
) -> IngestResult
```

**4 pasos secuenciales por artículo:**

1. **Fetch** — `GdeltScraper(queries).fetch()` → `list[RawArticle]`
2. **Store** — por cada artículo, verifica si URL ya existe en `Noticia`; si no, crea y hace `session.add()`. Cuenta `stored`.
3. **Classify** — llama `ClaudeClient.classify(noticia)` → asigna `noticia.sector` y `noticia.tipo_impacto`. Si falla (excepción o None), log error y continúa. Cuenta `classified`.
4. **Embed** — llama `embed_text(noticia.titulo, api_key_voyage)` → `store_embedding(noticia.id, vector, session)`. Si falla, log error y continúa. Cuenta `embedded`.

**Commit a DB al final** (no por artículo — la sesión hace commit al salir del `with get_session()`).

**Manejo de errores:** cada paso falla silenciosamente por artículo — `logger.error()` + continúa. El pipeline nunca lanza excepción; siempre devuelve `IngestResult`.

---

## CLI

**`pipeline/scrapers/gdelt_scraper.py`** tiene bloque `if __name__ == "__main__":`:

```bash
python -m pipeline.scrapers.gdelt_scraper
```

Lee del entorno: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`.
Imprime el `IngestResult` al terminar.

---

## API Endpoint

**Archivo:** `api/routers/admin.py`

```
POST /admin/ingest/gdelt
Header: X-Admin-Key: <ADMIN_API_KEY>
Response 200: {"fetched": 45, "stored": 38, "classified": 35, "embedded": 33}
Response 401: {"detail": "Unauthorized"}
```

Protegido con `ADMIN_API_KEY` leído de variable de entorno. Si el header `X-Admin-Key` no coincide, devuelve 401.

Llama a `run_gdelt_pipeline()` directamente (síncrono). El cliente espera la respuesta.

**Registrado en `api/main.py`:**
```python
app.include_router(admin.router, prefix="/admin", tags=["admin"])
```

**Variables de entorno nuevas** (añadir a `.env.example`):
```
ADMIN_API_KEY=
VOYAGE_API_KEY=
```

---

## Tests

| Archivo | Tests |
|---------|-------|
| `tests/scrapers/test_gdelt_scraper.py` | 4 tests: fetch retorna artículos, dedup por URL, maneja respuesta vacía, maneja error HTTP |
| `tests/test_ingest_gdelt.py` | 4 tests: pipeline completo con mocks, store salta duplicados, classify falla → continúa, embed falla → continúa |
| `tests/api/test_admin.py` | 2 tests: POST con key válida devuelve IngestResult, POST sin key devuelve 401 |

**Mocking:**
- GDELT API: `respx.mock`
- Claude API: `respx.mock`
- Voyage AI: `respx.mock`
- DB: SQLite in-memory (mismo patrón que Sprint 2)

---

## Success Criteria

- `pytest tests/ -q` → ≥ 48 tests (38 Sprint1+2 + 10 Sprint3)
- `python -m pipeline.scrapers.gdelt_scraper` corre sin errores con Postgres activo
- `POST /admin/ingest/gdelt` con header correcto devuelve `IngestResult`
- `POST /admin/ingest/gdelt` sin header devuelve 401
