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

## Estado actual (Sprint 114, 2026-04-25)
- 223 pytest + 48 Jest = 271 tests pasando
- 0 errores TypeScript
- Código en GitHub: https://github.com/sameconomia-prog/oia-ee.git
- Pendiente: Railway deploy (ver .env.example para env vars)

## Nuevas rutas backend (Sprints 46-89)
- `GET /publico/vacantes` — lista vacantes con filtro ?sector=
- `GET /publico/vacantes/skills` — top skills por frecuencia
- `GET /publico/sectores` — sectores únicos de vacantes
- `GET /publico/ies/{ies_id}/carreras` — carreras de una IES con KPIs
- `GET /publico/ies/{ies_id}` — detalle de IES con KPIs agregados (D1/D2 promedio, riesgo alto)
- `GET /publico/carreras/{carrera_id}` — detalle de carrera con KPIs y lista de IES
- `GET /publico/kpis/top-riesgo` — top N carreras por D1 (riesgo)
- `GET /publico/kpis/tendencias` — promedios históricos nacionales
- `POST /admin/cache/clear` — invalida cache KPIs nacional (5min TTL)
- `GET /publico/estadisticas` — resumen consolidado (IES, carreras, vacantes, noticias, top skills)
- `/publico/resumen` incluye `total_vacantes`; homepage tiene 4 StatCards
- `GET /publico/vacantes/{vacante_id}` — detalle de vacante por ID
- `GET /noticias/sectores` — sectores únicos de noticias (ordenados, antes de /{id})
- `GET /publico/carreras?q=` — búsqueda por texto en nombre de carrera
- `GET /publico/vacantes?q=&skip=&limit=` — búsqueda server-side + paginación
- `GET /publico/ies?q=` — búsqueda por nombre/nombre_corto
- `GET /publico/kpis/top-oportunidades?n=` — top N carreras por D2 (mejor D2 primero)
- `GET /publico/estadisticas` — resumen consolidado: IES, carreras, vacantes, noticias, alertas, top_skills
- `GET /publico/ies` — incluye `total_carreras` (count de CarreraIES por IES)
- `GET /publico/kpis/distribucion` — conteo de carreras en bins D1/D2 (Bajo/Medio/Alto)
- `GET /publico/vacantes/tendencia?meses=` — conteo mensual de vacantes IA
- `GET /publico/carreras/areas` — áreas de conocimiento únicas de carreras activas
- `GET /publico/carreras?area=` — filtro por área de conocimiento
- `GET /noticias/tendencia?meses=` — conteo mensual de noticias IA

## Páginas frontend (Sprints 46-89)
- `/vacantes` — vacantes con búsqueda, filtros por sector, CSV export
- `/ies` — listado de todas las IES con búsqueda
- `/ies/[id]` — detalle de IES: stats, promedio D1/D2, lista carreras, botón Comparar
- `/carreras/[id]` — detalle de carrera: KPI bars, lista IES que la ofrecen
- `/comparar?iesA=&iesB=` — acepta params para pre-selección desde /ies/[id]
- `/noticias/[id]` — detalle de noticia con resumen IA, causa, empresa, empleados
- `/vacantes/[id]` — detalle de vacante con nivel educativo, salario, skills
- Rankings de carreras, KpisTable y top riesgo (homepage) navegan a `/carreras/[id]`
- `/vacantes`: skill pills clickables filtran por habilidad; paginación "Cargar más"
- `/carreras`: botón Exportar CSV; mini gráfica histórica D1/D2 en /carreras/[id]
- Noticias: botón Exportar CSV en NoticiasTable
- Sidebar con highlight `startsWith` para rutas dinámicas
- `/estadisticas` — dashboard con totales: IES, carreras, vacantes, noticias, alertas, top skills
- `/ies` — tarjetas incluyen badge "X carreras" (consumido del campo total_carreras del API)
- Homepage incluye sección "Top oportunidades" (D2 más alto) junto a "Top riesgo" (D1 más alto)
- `/noticias` — filtro por impacto (riesgo/oportunidad/neutro) además de sector
- `/carreras` — ordenación client-side por D1/D2/nombre/matrícula + filtro por área de conocimiento
- `/vacantes` — mini bar chart de tendencia mensual de vacantes IA
- `/estadisticas` — barras de distribución D1/D2 por rango (Bajo/Medio/Alto) + mini bar charts tendencia noticias y vacantes

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
