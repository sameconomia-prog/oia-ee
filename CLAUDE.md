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

## Estado actual (Sprint 168, 2026-05-01)
- 458 pytest · 0 errores TypeScript · 76 artículos investigaciones
- P117-P126: benchmark signals, urgencia badges, brecha/calientes panels, tag cloud
- P127-P132: URL params persistence (carreras/vacantes/noticias/ies), BenchmarksSection homepage, comparar U column, CarrerasRanking U column, "Situación en México" en benchmarks/[slug]
- P133: URL params persistence (?q=) en /ies listing con botón clear
- P134: botón CSV export en /ies/[id] carreras list (D1–D6 + benchmark urgencia)
- P135: columna "MX" vacantes demanda en /benchmarks/skills index table
- P136: portfolioUrgencia stat card (5ª) en /ies/[id] con semáforo + sort por urgencia
- P137: doble alerta banner en /carreras/[id] (D1≥0.60 + urgencia≥60) + portfolioUrgencia /ies/[id]
- P138: D1/D2 aggregate comparison panel en /comparar (+ artículos enfermería/ciencias políticas/ing. civil — cobertura 100% 17 carreras)
- P139: U≥60 quick filter chip en /carreras listing
- P140: ⚠ Doble alerta quick filter chip en /carreras listing (D1≥0.60 + U≥60)
- P141: brecha de skills panel en /benchmarks/[slug] + filtro por carrera en /investigaciones (?benchmark= · 17 chips)
- P142: skills calientes panel en /benchmarks/[slug] + conteo artículos en tarjetas /benchmarks (grid y tabla)
- P143: badge de carrera benchmark (indigo) en tarjetas de artículos (/investigaciones + homepage) + BENCHMARK_LABELS centralizado
- P144: buscador de IES en hero de homepage (form → /ies?q=)
- P145: sitemap expandido con 17 benchmark careers + IES/carreras/pertinencia
- P146: CTA rector en /benchmarks (banner indigo → /pertinencia)
- P147: resumen en lecturas relacionadas de /benchmarks/[slug] + score numérico en BenchmarkMiniCard
- P148: botón "Copiar enlace" + conteo artículos en header de /benchmarks/[slug]
- P149: portfolioUrgencia vs. promedio nacional + card clickable → /benchmarks en /ies/[id]
- P150: top skills en declive global card in /estadisticas
- P151: text search input (?q=) en /benchmarks careers listing
- P152: señales activas chips on homepage (doble alerta, alta oportunidad, skills calientes)
- P153: urgencia curricular media row en /comparar aggregate comparison table
- P154: sort chips (D1/D2/nombre) + KPI badges D1/D2 en /ies listing
- P155: D2≥0.60 filter chip + ?oportunidad=1 URL param en /carreras listing + stat card en /estadisticas
- P156: lecturas relacionadas card en /carreras/[id] (benchmark articles API)
- P157: top skills calientes card en /estadisticas + top declining card en /estadisticas (par)
- P158: split demandaLaboral en calientes/brecha labeled panels en /carreras/[id]
- P159: carta-rectores link en sidebar de /pertinencia + alerta contextual en /ies/[id] cuando urgencia≥60
- P160: urgencia curricular media row en /comparar aggregate comparison table
- P161: portfolioUrgencia vs. promedio nacional + card clickable → /benchmarks en /ies/[id]
- P162: CLAUDE.md sync + git history cleanup
- P163: top 5 IES por riesgo D1 mini-table en /estadisticas + LinkedIn share button en /benchmarks/[slug]
- P164: ?sort= URL param persistence en /ies listing
- P165: carta-rectores como featured card (indigo, ancho completo) en /investigaciones cuando no hay filtros activos
- P166: rector CTA al final de artículos con tag 'rectores' en /investigaciones/[slug]
- P167: rector CTA en /benchmarks/[slug] cuando ≥30% skills en declive + LinkedIn share button
- P168: pre-fill carrera_nombre desde ?carrera= y ies_nombre desde ?ies= en /pertinencia (con Suspense wrapper)
- Código en GitHub: https://github.com/sameconomia-prog/oia-ee.git
- Frontend: https://frontend-one-psi-80.vercel.app (Vercel ✅)
- Backend: https://oia-api-production.up.railway.app (Railway ✅ corriendo)

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

## Benchmarks Globales (Sprint 120)
- `GET /publico/benchmarks/sources` — lista las 5 fuentes internacionales
- `GET /publico/benchmarks/sources/{source_id}` — detalle de fuente con todos sus hallazgos (career + skill context)
- `GET /publico/benchmarks/careers` — resumen de 17 carreras con urgencia_curricular (0–100)
- `GET /publico/benchmarks/careers/{slug}` — detalle con matriz de convergencia completa
- `GET /publico/benchmarks/skills` — índice de las 88 skills con dirección global, consenso% y carreras
- `GET /publico/benchmarks/skills/{skill_id}` — hallazgos cross-source para una skill
- `GET /publico/benchmarks/resumen` — estadísticas agregadas globales
- Datos en `api/data/global_benchmarks/` (YAML estático): 17 carreras, 5 fuentes, 88 skills
- Carreras: contaduria, diseno-grafico, ingenieria-sistemas, administracion-empresas, medicina, derecho, psicologia, mercadotecnia, arquitectura, enfermeria, comunicacion, economia, educacion, turismo, ciencias-politicas, nutricion, ingenieria-civil
- Páginas: `/benchmarks`, `/benchmarks/[slug]`, `/benchmarks/skills`, `/benchmarks/skills/[skill_id]`, `/benchmarks/comparar`, `/benchmarks/fuentes`, `/benchmarks/fuentes/[source_id]`
- SkillConvergenceTable: sort (riesgo/oportunidad/consenso) + filter (declining/growing/mixed/acción) + agrupar por tipo
- CurriculumActionSummary: recomendaciones en /benchmarks/[slug] agrupadas por acción (retirar/rediseñar/fortalecer/agregar)
- Skills index: filter por dir/tipo/carrera + sort por urgencia/consenso/nombre + URL params persistentes
- Benchmarks index: filter por área + sort por urgencia/riesgo/oportunidad/nombre + URL params persistentes
- urgencia_curricular: pct_declining × avg_consenso_declining / 100, rango 0–100
- `POST /pertinencia/solicitud` — registro de solicitudes de estudio de pertinencia (público)
- Página `/pertinencia` — formulario público de solicitud de estudio gratuito

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

---

## Design Tokens — OIA-EE

### Colores semáforo KPI (mismo estándar Humanitas)
```
verde:  color #10B981 | bg #ECFDF5 | text #065F46  → riesgo bajo / oportunidad alta
ámbar:  color #F59E0B | bg #FFFBEB | text #92400E  → riesgo medio
rojo:   color #EF4444 | bg #FEF2F2 | text #991B1B  → riesgo alto / alerta
```

### FanChart — bandas de confianza (Recharts directo, no Tremor)
```
banda 50%:  fill #3B82F6  opacity 0.35  → intervalo central
banda 80%:  fill #3B82F6  opacity 0.20  → intervalo medio
banda 95%:  fill #3B82F6  opacity 0.10  → intervalo exterior
línea central: stroke #1D4ED8  strokeWidth 2
```

### Tipografía
- Cuerpo: `Inter` (fallback: system-ui)
- Datos/KPIs: `Montserrat` (peso 600)
- Tablas: monospace para valores numéricos (`font-mono`)

### Brand OIA-EE
- Primario: `#1D4ED8` (azul académico)
- Acento: `#3B82F6`
- Fondo neutro: `#F8FAFC`

### Espaciado y bordes
- Border-radius: `8px` (cards), `4px` (badges)
- Padding card: `p-4` a `p-6`
- Sombra: `shadow-sm`

### Regla para Claude Code
Para gráficas de forecasting usa Recharts directamente — Tremor no soporta `ReferenceArea` custom necesaria para las bandas de confianza. Usa los opacities de arriba para mantener jerarquía visual clara entre bandas.
