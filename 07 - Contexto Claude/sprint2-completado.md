# OIA-EE — Sprint 2 Completado

**Fecha:** 2026-04-21
**Estado:** ✅ Completado y mergeado a `main`
**Tag git:** `sprint2-kpi-api-embeddings`

---

## Qué se construyó

| Módulo | Archivos | Tests |
|--------|----------|-------|
| KPI Engine D1 | `pipeline/kpi_engine/d1_obsolescencia.py` | 5 ✅ |
| KPI Engine D2 | `pipeline/kpi_engine/d2_oportunidades.py` | 4 ✅ |
| KPI Runner | `pipeline/kpi_engine/kpi_runner.py` | 2 ✅ |
| FastAPI /noticias | `api/main.py`, `api/deps.py`, `api/schemas.py`, `api/routers/noticias.py` | 5 ✅ |
| FastAPI /kpis | `api/routers/kpis.py` | 3 ✅ |
| Embeddings | `pipeline/utils/embeddings.py` | 4 ✅ |

**Total: 38 tests pasando (15 Sprint1 + 23 Sprint2)**

---

## KPI Engine

### D1 — Obsolescencia (`Score = IVA×0.5 + BES×0.3 + VAC×0.2`)

| KPI | Fórmula |
|-----|---------|
| IVA | promedio `p_automatizacion` de ocupaciones ONET; default 0.5 si sin datos |
| BES | 1 − (overlap plan_skills ∩ vacantes_skills) / plan_skills |
| VAC | 1 − min(1, vacantes/egresados) |

### D2 — Oportunidades (`Score = IOE×0.4 + IHE×0.35 + IEA×0.25`)

| KPI | Fórmula |
|-----|---------|
| IOE | % vacantes con ≥1 skill emergente (`EMERGING_SKILLS` frozenset: python, ML, cloud, etc.) |
| IHE | overlap plan_skills ∩ EMERGING_SKILLS / len(EMERGING_SKILLS) |
| IEA | (egresados/matricula)×0.6 + (vacantes/egresados)×0.4 |

### Runner

```python
from pipeline.kpi_engine.kpi_runner import run_kpis

result = run_kpis(carrera_id, session)
# result.d1_obsolescencia.score  → float 0-1
# result.d2_oportunidades.score  → float 0-1
# returns None si carrera no existe o sin datos de matrícula
```

---

## FastAPI

```bash
# Arrancar el servidor
cd /Users/arturoaguilar/Documents/OIA-EE
source pipeline/.venv/bin/activate
DATABASE_URL=postgresql://oia:secret@localhost:5432/oiaee uvicorn api.main:app --reload
```

Endpoints disponibles:
- `GET /health` → `{"status": "ok"}`
- `GET /noticias/?skip=0&limit=20&sector=tecnologia` → lista paginada
- `GET /noticias/{id}` → noticia individual (404 si no existe)
- `GET /kpis/carrera/{id}` → scores D1+D2 (404 si carrera sin datos)

---

## Embeddings

```python
from pipeline.utils.embeddings import embed_text, store_embedding, search_similar

# Obtener embedding de Voyage AI
vector = embed_text("texto a embeder", api_key=os.getenv("VOYAGE_API_KEY"))

# Almacenar en DB
store_embedding(noticia_id, vector, session)

# Buscar similares (cosine similarity en Python)
noticias = search_similar(query_vector, session, top_k=5)
```

Modelo: `voyage-3-lite` (1024 dimensiones)
En Sprint 3 se activará pgvector nativo para búsqueda eficiente.

---

## Para continuar

```bash
cd /Users/arturoaguilar/Documents/OIA-EE

# Activar venv
source pipeline/.venv/bin/activate

# Correr todos los tests
PYTHONPATH=. pytest tests/ -q

# Levantar Postgres si no está corriendo
docker compose -f infra/docker-compose.yml up -d
```

---

## Deuda conocida (para Sprint 3)

| Ítem | Estado |
|------|--------|
| `GET /noticias/buscar?q&top_k` endpoint | Omitido en Sprint 2 — requiere embeddings en Postgres |
| pgvector nativo | Actualmente usa `embedding_json` (Text) — activar tipo vector en Sprint 3 |
| `datetime.utcnow()` deprecation en models | Advertencia SQLAlchemy — fix en Sprint 3 |
| Dashboard Next.js | Candidato Sprint 3 |
