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

## Estado actual (Sprint 204, 2026-05-01)
- 471 pytest · 0 errores TypeScript · 78 artículos investigaciones
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
- P169: vs-promedio-nacional footer row en KPI card /carreras/[id] + share button /investigaciones/[slug]
- P170: LinkedIn share button en /ies/[id]
- P171: perfil de riesgo narrative text card en /ies/[id] para rectores
- P172: LinkedIn share button en /carreras/[id]
- P173: narrativa impacto IA card en /carreras/[id] (rojo/ambar/verde según D1+D2+urgencia+promedio nacional)
- P174: carrera prioritaria callout en /ies/[id] con CTA pre-fill → /pertinencia
- P175: botón "Copiar diagnóstico" en /carreras/[id] (D1/D2/urgencia/URL a clipboard)
- P176: botón "Copiar diagnóstico" en /ies/[id] (D1/D2/riesgo alto/urgencia/URL a clipboard)
- P177: distribución D1 mini bar chart (bajo/medio/alto) en /ies/[id]
- P178: explainer colapsable ¿Qué significan estos indicadores? en /carreras/[id] KPI card
- P179: top 8 skills nacionales en demanda card en /carreras/[id] con pills clickables
- P180: distribución urgencia benchmark (alta/media/baja) counter cards en /ies/[id]
- P181: artículo MDX "Guía práctica: uso de benchmarks para planificación curricular" (analisis, tags rectores)
- P182: artículo MDX "Cómo la IA redefine la competencia entre IES en México" (analisis, tags rectores)
- P183: bloque 'Para rectores y directivos' en /investigaciones (3 artículos: principal + 2 secundarios en grid)
- P184: GET /pertinencia/contador público + social proof "X instituciones ya solicitaron" en /pertinencia hero
- P185: banner rector CTA en homepage entre BenchmarksSection y SobreElAnalista (gradiente indigo, mensaje dinámico con dobleAlertaCount)
- P186: botón 'Copiar diagnóstico' en /benchmarks/[slug] (urgencia + declining/growing/mixed + URL)
- P187: top urgentes skills críticas card en /benchmarks/[slug] (declining+consenso≥60%, con acción recomendada)
- P188: social proof contador solicitudes near rector CTA en /benchmarks/[slug]
- P189: top 5 benchmarks por urgencia curricular card standalone en /estadisticas
- P190: explainer colapsable ¿Cómo leer este índice? en /benchmarks listing
- P191: horizonte_dominante badge (≤2/3–5/5+ años) en top urgentes card /benchmarks/[slug]
- P192: contexto nacional D1/D2 card en sidebar /pertinencia (getTendenciasNacionales)
- P193: artículo MDX "3 señales de que tu carrera necesita actualización curricular — ahora" (analisis, tags rectores)
- P194: (vacío, skip)
- P195: artículo MDX "3 señales de que tu carrera necesita actualización curricular" — ver P193
- P196: sección "Publicaciones recientes" al pie de /investigaciones/[slug] (3 más recientes excl. current+related)
- P197: WhatsApp share button en /investigaciones/[slug] share row
- P198: navegación anterior/siguiente (por fecha) al pie de /investigaciones/[slug]
- P199: badge "Nuevo" en artículos publicados ≤14 días en /investigaciones listing e InvestigacionesGrid
- P200: artículo MDX "Por qué el D1 sube aunque no cambies nada" (analisis, tags rectores — explicación metodológica)
- P201: rediseño editorial InvestigacionesGrid homepage — 1 principal (3/5) + 3 secundarios (2/5)
- P202: stats de cobertura en header de /investigaciones (total · tipos · carreras cubiertas)
- P203: bloque rector en /investigaciones amplía a 5 artículos (1 principal + 4 secundarios 2×2)
- P204: sistema de monitoreo de continuidad — PipelineRun model + migración Alembic (con seed _heartbeat), pipeline/monitoring.py (notify_job_result, deduplicación email ok→error/error→ok vía Resend), 14 jobs envueltos en api/main.py con try/except/notify_job_result + _write_heartbeat cada 30 min (Option C: inline scheduler, sin Railway Scheduler separado), GET /health con thresholds por 14 job_ids (503 si scheduler muerto, 200 degraded si job estancado/error), 471 tests · UptimeRobot pendiente configuración manual
- F0 (2026-05-08): bloqueadores de auditoría 360° — pool DB config (postgres only), OCC timeout uniforme 15s, unique constraint vacantes(fuente,url) + columna url + backfill desde raw_json (migration 20260508000001), refresh tokens hasheados SHA-256 + rename column token→token_hash + purge plaintext (migration 20260508000002), frontend refreshAccessToken + authedFetch interceptor 401 con retry, decodeJwtPayload helper sustituye atob() manual frágil. ⚠️ APScheduler sin distributed lock — ver `docs/SCALING.md` antes de escalar Railway a 2+ instancias.
- F1 pricing (2026-05-08): /pertinencia ahora es Diagnóstico Express (gratis, 3 carreras, PDF 4 págs/c) + sección Estudio Profundo ($120k MXN, 17 carreras, PDF 11 págs). /planes refleja la diferenciación: Pro incluye 1 Estudio Profundo/año, Enterprise 2/año. Resuelve contradicción gratis-vs-pago detectada en auditoría estratégica.
- Agentes IA Sprint 1 (2026-05-08): pipeline/agents/{common,linkedin_synth}/ — wrapper anthropic_client con prompt caching ephemeral + run_logger JSONL. Agente C (LinkedIn Synthesizer) MVP funcional con Haiku 4.5: cli `python -m pipeline.agents.linkedin_synth.cli --slug X --pillar Y`. Pillars: diagnostico_semanal, metrica_explicada, lectura_rectores, build_in_public. Few-shots 2 por pillar. Output JSON validado vs schema LinkedInPost (pydantic). Costo estimado ~$0.013/post con cache caliente. Próximos sprints: RAG indexer + Agente A (Editorial Writer) + Agente B (Quantitative Research). Diseño completo en `docs/agents/AGENTS_DESIGN.md`.
- Agentes IA Sprint 2 (2026-05-09): RAG + Agente A (Editorial Writer). Estructura: `pipeline/agents/rag/{chunker,embed_client,store,indexer,retriever,cli}.py` + `pipeline/agents/editorial_writer/{agent,cli,prompts/system.md}`. RAG: chunker MDX por H2 (max ~800 tok), EmbedClient cascada Mistral→Cohere (Mistral primary porque Cohere geo-bloqueó), local store npz+json normalized cosine (sin pgvector — decisión MVP, ~700KB para 720 chunks). 88 MDX → 720 chunks indexados. CLI: `python -m pipeline.agents.rag.cli {index,query,stats}`. Agente A: `write_mdx(brief, tipo, fecha, ...)` con RAG top-5 + system prompt 200+ líneas con voz académica + frontmatter spec + restricciones. Validador post-hoc con pyyaml. Trim regex elimina meta-notas finales tipo "Nota: artículo tiene X palabras". Backend default router (gratis), opcional anthropic Sonnet 4.6. Smoke test verde con MDX completo válido frontmatter+body. Pendiente Sprint 3: tools live (kpi_lookup, benchmark_lookup, source_lookup) + validador anti-alucinación.
- Agentes IA Sprint 3 (2026-05-09): tools live + validators + pre-fetch + promote. **tools/**: kpi_lookup/benchmark_lookup (llaman /publico/benchmarks/careers de Railway, devuelven urgencia + counts agregados + top 3 skills declining/growing con consenso_pct + acción curricular), source_lookup (5 fuentes WEF/McKinsey/CEPAL/Frey-Osborne/Anthropic), corpus_search (wrap del retriever local), _http (helper httpx con OIA_API_URL env var, default Railway prod). **validators/**: cifras (regex extrae números, verifica anclaje cita en ±140 chars contra lista verbos atribución + autores + fuentes; ratio_cited reportado), wikilinks (valida /investigaciones/<slug> contra archivos del repo + /benchmarks/<slug> contra lista API benchmark; flagsea ruta_inventada/investigacion_inexistente/benchmark_no_listado), frontmatter (compartido). **agent.py**: _detect_benchmark_slug detecta slug en brief o usa carrera_benchmark explícito; _prefetch_tool_data trae KPI+benchmark; _format_tool_data renderiza JSON al user message como "Datos verificados (USA SOLO ESTOS números)"; auto-pone benchmark en frontmatter; quality_report() corre cifras+wikilinks+frontmatter. **CLI**: `--report PATH` ejecuta validadores sobre cualquier MDX existente; `--promote PATH [--slug ALT]` mueve draft a frontend/src/content/investigaciones/. Smoke test E2E con brief Contaduría: pre-fetch trajo urgencia=71, 5 declining (Contabilidad básica/Conciliación bancaria/Reportes con consenso 100% retirar); MDX generado citó esos datos sin inventar; validador detectó 13/21 cifras sin cita (modelo fabricó "82% Tec Monterrey" — flagged); 4/4 wikilinks válidos.
- Agentes IA Sprint 4 (2026-05-09): **Agente B (Quantitative Research Analyst)** + handoff B→A. Estructura `pipeline/agents/research_analyst/{pdf_loader,agent,handoff,cli,prompts/system.md}`. **pdf_loader.py**: carga PDF/txt/md desde URL (httpx) o path con cache local SHA-keyed (cache/<sha>.txt) + extracción texto vía pypdf con marcadores [Page N]. **schemas extendidos en common/schemas.py**: Finding (enunciado+source_quote+page+confidence alta/media/baja) · SkillEmergente (direccion growing/declining/mixed/stable + horizonte corto/medio/largo) · CarreraImpactada (slug+magnitud+justificacion) · YamlPatchSuggestion (carrera+skill+accion+payload) · ResearchOutput (summary_es+findings+skills+carreras+yaml_patch+brief_for_writer). EditorialBrief expandido para aceptar tipo='carta'. **agent.py**: analyze(source, focus?, backend) carga doc → chunkea por páginas si >60k chars → pasa al modelo con system prompt cacheado (Anthropic) o plano (router con orden Qwen/DeepSeek/Mistral por context window) → consolida partial outputs → valida ResearchOutput. JSON repair con 1 retry si parse falla. **handoff.py**: brief_to_writer_args(research) construye kwargs para Editorial.write_mdx desde brief_for_writer + extra_context con findings citados literalmente. **CLI**: `--source PATH_OR_URL`, `--focus`, `--inspect` (estadísticas sin API), `--to-writer` (encadena B→A). System prompt 200+ líneas: confianza obligatoria por hallazgo (alta=cita literal/media=inferencia 1 paso/baja=múltiple), output 100% JSON, restricciones contra cifras inventadas, schema explícito. Smoke test E2E con paper sintético WEF+IDB sobre IA en educación LATAM: 6 findings TODOS confianza alta con cita textual + p.11/14/18/22/31, 9 skills clasificadas correctamente (4 growing largo plazo: Auditor IA, Ética Computacional, etc; 3 declining corto: asientos manuales, contratos plantilla, búsqueda jurisprudencial), 4 carreras impactadas (contaduria/derecho alta, medicina/ingenieria-sistemas media), 6 patches YAML, brief_for_writer completo con 5 datos_clave todos con cita formato `(WEF/IDB 2026, p.X)`. Sistema de 3 agentes COMPLETO: B(papers→findings JSON) → handoff → A(brief→MDX validado) → C(MDX→post LinkedIn). Costo estimado pipeline completo: ~$0 con backend router (free-ai-stack) o ~$2.30/mes con Anthropic.
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
