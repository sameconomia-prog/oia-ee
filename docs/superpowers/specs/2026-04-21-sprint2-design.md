# OIA-EE Sprint 2 — Design Spec: KPI Engine + FastAPI + Embeddings

**Fecha:** 2026-04-21
**Estado:** Aprobado
**Objetivo:** KPI Engine D1/D2 funcional con tests, FastAPI básica, y embeddings semánticos — todo testeable sin frontend.

---

## Arquitectura

Sprint 2 añade 3 módulos independientes sobre la base del Sprint 1:

```
pipeline/kpi_engine/   → cálculo puro de KPIs (funciones puras, testeable con SQLite)
api/                   → FastAPI REST (TestClient para tests, sin levantar servidor)
pipeline/utils/        → embed_text() + store_embedding() + search_similar() (mock respx)
```

Los 3 módulos usan los modelos SQLAlchemy existentes. No hay cambios de schema (embedding_json ya existe como Text).

---

## KPI Engine D1 — Obsolescencia

Tres sub-KPIs, cada uno función pura:

| KPI | Fórmula | Inputs DB |
|-----|---------|-----------|
| **IVA** | promedio `p_automatizacion` de ocupaciones ONET relacionadas | `Ocupacion`, `Carrera.onet_codes_relacionados` |
| **BES** | 1 − (overlap plan_skills ∩ vacantes_skills) / plan_skills | `CarreraIES.plan_estudio_skills`, `Vacante.skills` |
| **VAC** | 1 − min(1, vacantes/egresados) | `Vacante` count, `CarreraIES.egresados` |

**Score D1** = IVA×0.5 + BES×0.3 + VAC×0.2

---

## KPI Engine D2 — Oportunidades

| KPI | Fórmula | Inputs DB |
|-----|---------|-----------|
| **IOE** | % vacantes con ≥1 skill emergente (lista fija: python, ML, cloud, etc.) | `Vacante.skills` |
| **IHE** | overlap plan_skills ∩ EMERGING_SKILLS / len(EMERGING_SKILLS) | `CarreraIES.plan_estudio_skills` |
| **IEA** | (egresados/matricula)×0.6 + (vacantes/egresados)×0.4 | `CarreraIES`, `Vacante` count |

**Score D2** = IOE×0.4 + IHE×0.35 + IEA×0.25

---

## FastAPI

- `GET /health` → `{"status": "ok"}`
- `GET /noticias?skip&limit&sector` → lista paginada
- `GET /noticias/{id}` → noticia individual (404 si no existe)
- `GET /kpis/carrera/{id}` → scores D1+D2 (404 si carrera no existe)
- `GET /noticias/buscar?q&top_k` → búsqueda semántica (embeddings)
- Tests con `TestClient` de FastAPI + DB SQLite override vía `Depends`
- Añadir a requirements: `fastapi==0.111.0`, `uvicorn[standard]==0.29.0`

---

## Embeddings

- `embed_text(text, api_key)` — POST a Voyage AI (`https://api.voyageai.com/v1/embeddings`, model `voyage-3-lite`), retorna `list[float]` 1024-dim o `None` en error
- `store_embedding(noticia_id, vector, session)` — serializa JSON en `Noticia.embedding_json`
- `search_similar(query_vector, session, top_k)` — cosine similarity en Python (pgvector nativo en Sprint 3)
- Tests con `respx` mock

---

## Success Criteria

- `pytest tests/ -q` → ≥37 tests passing (15 Sprint1 + ~22 Sprint2)
- `uvicorn api.main:app` arranca sin errores con Postgres corriendo
- KPIs calculan valores reales con fixtures en SQLite
