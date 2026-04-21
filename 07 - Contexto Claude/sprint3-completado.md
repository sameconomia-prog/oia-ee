# OIA-EE — Sprint 3 Completado

**Fecha:** 2026-04-21
**Estado:** ✅ Completado y mergeado a `main`
**Tag git:** `sprint3-gdelt-loader`

---

## Qué se construyó

| Módulo | Archivos | Tests |
|--------|----------|-------|
| GdeltScraper | `pipeline/scrapers/gdelt_scraper.py` | 4 ✅ |
| Ingest Pipeline | `pipeline/ingest_gdelt.py` | 4 ✅ |
| Admin API | `api/routers/admin.py` | 2 ✅ |

**Total acumulado: 48 tests pasando (38 Sprint1+2 + 10 Sprint3)**

---

## GdeltScraper

Busca noticias en GDELT DOC API con 6 queries bilingüe (español + inglés). Sin filtro de idioma — cobertura global.

```python
from pipeline.scrapers.gdelt_scraper import GdeltScraper, DEFAULT_QUERIES

scraper = GdeltScraper(queries=DEFAULT_QUERIES)  # o queries personalizadas
articles = scraper.fetch()  # list[RawArticle]
```

**6 queries por defecto:**
- `"inteligencia artificial empleo"`
- `"AI jobs education"`
- `"automatización trabajo"`
- `"machine learning workforce"`
- `"IA educación México"`
- `"artificial intelligence employment"`

**API:** `https://api.gdeltproject.org/api/v2/doc/doc` — pública, sin auth, máx 250 artículos/query.

---

## Pipeline de Enriquecimiento

```python
from pipeline.ingest_gdelt import run_gdelt_pipeline, IngestResult

with get_session() as session:
    result: IngestResult = run_gdelt_pipeline(
        session=session,
        api_key_claude=os.getenv("ANTHROPIC_API_KEY"),
        api_key_voyage=os.getenv("VOYAGE_API_KEY"),
    )
# result.fetched   → total artículos de GDELT
# result.stored    → nuevos guardados en DB (sin duplicados por URL)
# result.classified → clasificados con Claude (sector + tipo_impacto)
# result.embedded   → con embedding Voyage AI almacenado
```

**Errores silenciosos:** si Claude o Voyage fallan en un artículo, el pipeline continúa.

---

## CLI

```bash
cd /Users/arturoaguilar/Documents/OIA-EE
source pipeline/.venv/bin/activate
DATABASE_URL=postgresql://oiaee:oiaee_dev@localhost:5432/oia_ee \
ANTHROPIC_API_KEY=sk-ant-... \
VOYAGE_API_KEY=pa-... \
python -m pipeline.scrapers.gdelt_scraper
```

---

## API Endpoint

```
POST /admin/ingest/gdelt
Header: X-Admin-Key: <ADMIN_API_KEY>
```

Respuesta: `{"fetched": 45, "stored": 38, "classified": 35, "embedded": 33}`

**Variables de entorno necesarias (añadidas a `.env.example`):**
```
VOYAGE_API_KEY=pa-...
ADMIN_API_KEY=<clave secreta>
```

---

## Para continuar

```bash
cd /Users/arturoaguilar/Documents/OIA-EE
source pipeline/.venv/bin/activate
PYTHONPATH=. pytest tests/ -q       # 48 tests
docker compose -f infra/docker-compose.yml up -d  # Postgres si no está
```

---

## Deuda conocida (Sprint 4)

| Ítem | Estado |
|------|--------|
| pgvector nativo | `embedding_json` (Text) → tipo `vector` real |
| `GET /noticias/buscar?q&top_k` | Búsqueda semántica vía API |
| Dashboard Next.js | Frontend con tabla noticias + KPIs + botón "Actualizar GDELT" |
| `datetime.utcnow()` deprecation | 14 warnings en tests — fix menor |
