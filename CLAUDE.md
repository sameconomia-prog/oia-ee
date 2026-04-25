# OIA-EE — Instrucciones para Claude Code

## Proyecto
Observatorio de Impacto IA en Educación y Empleo. FastAPI backend + Next.js 14 frontend.

## Comandos esenciales

```bash
# Tests
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q

# TypeScript check
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit

# Arrancar backend dev
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && uvicorn api.main:app --reload

# Arrancar frontend dev
cd ~/Documents/OIA-EE/frontend && npm run dev
```

## Estructura
```
OIA-EE/
├── api/           # FastAPI routers, schemas, deps
├── pipeline/      # KPI engine, DB models, migrations
│   ├── db/models.py
│   ├── db/migrations/  # Alembic
│   ├── kpi_engine/     # D1-D7 calculators
│   └── requirements.txt
├── frontend/      # Next.js 14 App Router
│   └── src/
│       ├── app/       # Pages
│       ├── components/
│       └── lib/       # api.ts, types.ts, auth.ts
├── tests/         # pytest (conftest.py + tests/api/)
├── Procfile       # Railway start command
└── nixpacks.toml  # Railway build config
```

## Reglas de desarrollo
- Siempre correr tests antes de hacer commit
- TypeScript: `npx tsc --noEmit` antes de commit
- No hacer git push sin verificar que los tests pasan
- Al terminar sprints: guardar nota en Obsidian Vault `/Users/arturoaguilar/Documents/Obsidian Vault/01 - Proyectos/OIA-EE/`

## Estado actual (Sprint 64, 2026-04-25)
- 192 tests pasando
- 0 errores TypeScript
- Código en GitHub: https://github.com/sameconomia-prog/oia-ee.git
- Pendiente: Railway deploy (ver .env.example para env vars)

## Nuevas rutas (Sprints 46-64)
- `GET /publico/vacantes` — lista vacantes con filtro ?sector=
- `GET /publico/vacantes/skills` — top skills por frecuencia
- `GET /publico/sectores` — sectores únicos de vacantes
- `GET /publico/ies/{ies_id}/carreras` — carreras de una IES con KPIs
- `GET /publico/kpis/top-riesgo` — top N carreras por D1 (riesgo)
- `GET /publico/kpis/tendencias` — promedios históricos nacionales
- `POST /admin/cache/clear` — invalida cache KPIs nacional (5min TTL)
- `GET /publico/estadisticas` — resumen consolidado (IES, carreras, vacantes, noticias, top skills)
- `/vacantes` — página pública de vacantes con búsqueda, filtros, CSV
- `/publico/resumen` incluye `total_vacantes`; homepage tiene 4 StatCards

## Tests
```
tests/
├── conftest.py          # SQLite in-memory fixture
├── test_migrations.py   # Alembic migrations
└── api/
    ├── test_admin.py, test_alertas.py, test_auth.py
    ├── test_escenarios.py, test_kpis*.py, test_noticias.py
    ├── test_publico.py, test_rector.py
```
