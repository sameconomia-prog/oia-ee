# OIA-EE — Sistema de 3 Agentes IA (Editorial / Research / LinkedIn)

Reemplazo de investigador-escritor part-time. Diseño técnico opinado, listo para construir.

---

## 0. Decisiones transversales (resumen)

- **SDK**: `anthropic` Python (ya instalado). Fallback con `ai_router` solo para Agente C (no para A/B porque la voz académica y la fidelidad a fuentes requieren Claude).
- **RAG vs prompt-stuffing**: **RAG con pgvector** sobre los 88 MDX. Prompt-stuffing rompe a los ~30 artículos y el corpus va a crecer. Reusar `pgvector` ya configurado en `noticias`; replicar tabla `investigaciones_chunks`.
- **Embeddings**: `voyage-3-lite` (mejor calidad/precio para español + cache local). Alternativa gratuita: `text-embedding-3-small` vía OpenAI key existente, o `embed-multilingual-light-v3` de Cohere (Free tier vía ai_router).
- **Prompt caching**: `cache_control` con `ephemeral` 1h en bloques estables (corpus de voz, taxonomía 88 skills, frontmatter spec, voz guidelines). Estructura: `[system cached] [tools cached] [docs cached] [user volatile]`.
- **Patrón de invocación**: CLI `python -m pipeline.agents.<agente> ...` + endpoints FastAPI thin wrapper en `/admin/agents/*` (auth-only). Cron solo para Agente B en watch-mode (futuro).
- **Logging**: cada invocación genera un JSONL en `pipeline/agents/logs/<agente>/YYYY-MM-DD.jsonl` con `{run_id, model, tokens_in, tokens_in_cached, tokens_out, cost_usd, input_hash, output_path, latency_ms}`. También un row en tabla `agent_runs` (Postgres).

---

## 1. Agente A — Editorial Writer

### 1.1 Modelo y razón

**Sonnet 4.6** (`claude-sonnet-4-6`). Razones:
- Voz académica + síntesis con datos reales: Sonnet 4.6 es el sweet-spot calidad/costo. Opus es overkill para 1500 palabras.
- Tool-use confiable (necesita llamar al KPI engine).
- Prompt caching agresivo amortiza el corpus de voz.

**Haiku 4.5** queda para una segunda pasada de "editor" (revisor de tono y frontmatter) — opcional fase 2.

### 1.2 System prompt (esquemático)

```
ROL: Editor senior de OIA-EE. Voz académica mexicana, opinada, sobria.
RESTRICCIONES:
- Nunca inventar métricas. Si falta dato → llamar tool `kpi_lookup` o decir "no hay dato disponible".
- Citar las 5 fuentes internacionales solo cuando el contenido lo amerite (Frey-Osborne, WEF, McKinsey, CEPAL, Eloundou/Anthropic).
- Frontmatter MDX exacto: titulo, tipo (analisis|nota|investigacion), fecha (YYYY-MM-DD), resumen (≤280 chars), tags (array), acceso (abierto|premium), benchmark (slug opcional).
- Cuerpo 800–1500 palabras. H2/H3 estructurado. Tablas markdown cuando aporten. Cero emojis.
HERRAMIENTAS: kpi_lookup, benchmark_lookup, corpus_search, source_lookup
FORMATO OUTPUT: bloque ```mdx con frontmatter + cuerpo, seguido de bloque JSON con metadata (image_prompt, related_slugs, citations_used).
```

### 1.3 Caching strategy

| Bloque | Cache | Tamaño aprox | TTL |
|---|---|---|---|
| Voz guidelines + 8 ejemplos shortlist (top MDX) | sí | ~12k tok | 1h |
| Frontmatter spec + tipos enum + tags vocab | sí | ~1.5k tok | 1h |
| Taxonomía 88 skills + 17 carreras (slug→nombre) | sí | ~3k tok | 1h |
| Brief del usuario + RAG hits (top-5 chunks) | no | variable | — |
| Tool results (KPI live) | no | variable | — |

### 1.4 Tools

```python
TOOLS_A = [
  {"name": "kpi_lookup",
   "input_schema": {"type":"object","properties":{
       "carrera_id":{"type":"integer"},
       "carrera_slug":{"type":"string"},
       "metric":{"enum":["D1","D2","D3","D4","D5","D6","D7","all"]}}},
   "description":"Devuelve KPIs vivos desde /publico/carreras/{id} o por slug."},
  {"name": "benchmark_lookup",
   "input_schema": {"type":"object","properties":{
       "slug":{"type":"string"}}},
   "description":"Datos benchmark global (urgencia, top declining, top growing)."},
  {"name": "corpus_search",
   "input_schema": {"type":"object","properties":{
       "query":{"type":"string"},"k":{"type":"integer","default":5}}},
   "description":"RAG sobre los 88 MDX. Devuelve chunks con slug+score."},
  {"name": "source_lookup",
   "input_schema": {"type":"object","properties":{
       "source_id":{"enum":["wef","mckinsey","cepal","frey-osborne","eloundou-anthropic"]}}},
   "description":"Hallazgos clave de fuente internacional."},
]
```

### 1.5 Tokens estimados / invocación

- Cached input: ~16.5k tok (corpus+spec+taxonomía) → cobro reducido tras primer hit.
- Non-cached input: ~3k tok (brief + RAG chunks + tool results).
- Output: ~2.5k tok (1300 palabras + frontmatter + JSON metadata).
- **Costo por MDX**: ~$0.04–0.06 USD con cache caliente, ~$0.12 frío.

### 1.6 Refusal recovery

Si el modelo rehúsa por falta de dato → captura `stop_reason=tool_use` no completado y reintenta con instrucción explícita "marca con `[DATO PENDIENTE]` y continúa". Si el output viola frontmatter spec → validador post-hoc (`pyyaml` parse del frontmatter) → 1 reintento con error como user message.

---

## 2. Agente B — Quantitative Research Analyst

### 2.1 Modelo y razón

**Opus 4.7 1M** (`claude-opus-4-7[1m]`). Razones:
- PDFs >50 pág + extracción cuantitativa cuidadosa: Opus minimiza alucinación numérica.
- Context 1M permite cargar el paper completo sin chunkeo agresivo.
- Costo amortizado por prompt caching del paper (cache 1h cubre múltiples queries sobre el mismo doc).

### 2.2 System prompt (esquemático)

```
ROL: Analista cuantitativo. Extrae hallazgos verificables, no narrativa.
RESTRICCIONES:
- Toda métrica debe incluir cita textual (page/section). Si no hay cita → omitir.
- Confianza por hallazgo: alta (cita literal), media (inferencia 1 paso), baja (inferencia múltiple).
- Output 100% JSON válido contra schema. Sin prosa fuera del JSON.
- Si dataset numérico (CSV/JSON), usa tool `compute_stats` antes de afirmar.
HERRAMIENTAS: compute_stats, taxonomy_match, benchmark_diff
FORMATO: JSON {summary_es, findings[], skills_emergentes[], carreras_impactadas[], yaml_patch_suggestion, brief_for_writer}
```

### 2.3 Caching strategy

- **El PDF/reporte se cachea como bloque `document`** con `cache_control` ephemeral. Permite múltiples passes (extract → validate → diff) reusando el mismo cache.
- Schemas y taxonomía cacheados.

### 2.4 Tools

```python
TOOLS_B = [
  {"name":"compute_stats",
   "input_schema":{"type":"object","properties":{
     "csv_path":{"type":"string"},"op":{"enum":["mean","median","trend","top_k"]},
     "column":{"type":"string"},"k":{"type":"integer"}}},
   "description":"Calcula stats sobre CSV/JSON sin alucinación."},
  {"name":"taxonomy_match",
   "input_schema":{"type":"object","properties":{
     "candidate_skill":{"type":"string"}}},
   "description":"Mapea skill candidata a las 88 ya en taxonomía (fuzzy + embedding)."},
  {"name":"benchmark_diff",
   "input_schema":{"type":"object","properties":{
     "carrera_slug":{"type":"string"},
     "proposed_changes":{"type":"object"}}},
   "description":"Diff vs YAML actual para mostrar impacto del patch."},
]
```

### 2.5 Tokens estimados

- Paper 60pp ≈ 80k tok (cached tras 1ª pasada).
- Schemas + taxonomía ≈ 5k tok cached.
- Output JSON ≈ 3–4k tok.
- **Costo por reporte**: ~$0.40 frío, ~$0.10 caliente.

### 2.6 Refusal recovery

Validación JSON-Schema con `jsonschema` + reintento con error específico. Si campo falta → re-pregunta dirigida ("¿en qué página/tabla aparece esto?"). Score de confianza sub-umbral (baja en >40% findings) → flag para revisión humana obligatoria.

---

## 3. Agente C — LinkedIn Synthesizer

### 3.1 Modelo y razón

**Haiku 4.5** (`claude-haiku-4-5`) con **fallback al `ai_router` (Groq Llama-3.1-70B)** para volumen alto.
- Tarea cerrada, output corto, no requiere razonamiento profundo.
- Haiku barato y rápido. Si falla auth o rate-limit → ai_router.
- El estilo LinkedIn se entrena con 5–8 ejemplos few-shot (no necesita RAG completo).

### 3.2 System prompt (esquemático)

```
ROL: Editor LinkedIn de OIA-EE. Tono directo, opinado, dato fuerte primero.
RESTRICCIONES:
- Hook no clickbait. Empezar con cifra real del MDX, NO pregunta retórica.
- 200–300 palabras. 3 bullets densos. CTA específico (link relativo).
- Sin markdown que rompa al pegar (no #, no **; usar UPPERCASE para énfasis sutil).
- Hashtags 3–5, en español, sector específico.
- Pillar editorial: respetar el indicado en input.
PILLARS: diagnostico_semanal | metrica_explicada | lectura_rectores | build_in_public
FORMATO OUTPUT: JSON {linkedin_text, hashtags[], carrusel:{slides:[{title,body}]}, reel_script}
```

### 3.3 Caching

- 8 ejemplos few-shot por pillar (32 ejemplos total, ~6k tok) cacheados 1h.
- MDX fuente NO cacheado (varía cada invocación) — pero se pasa solo el cuerpo recortado a ~3k tok.

### 3.4 Tools

Ninguna. Es transformación pura. Mantener simple = barato + rápido.

### 3.5 Tokens estimados

- Cached: ~6k tok.
- Non-cached: ~3.5k tok (MDX + brief).
- Output: ~1.5k tok.
- **Costo por post**: ~$0.005–0.01 USD. Con ai_router gratis si falla.

---

## 4. RAG sobre los 88 MDX

### 4.1 Indexación

```python
# pipeline/agents/rag/indexer.py
CHUNK_SIZE = 800   # tokens (~600 palabras)
OVERLAP = 100
EMBED_MODEL = "voyage-3-lite"  # 1024 dims

# Metadata por chunk:
# {slug, titulo, tipo, fecha, tags, benchmark, chunk_idx, total_chunks}
```

### 4.2 Tabla pgvector

```sql
CREATE TABLE investigaciones_chunks (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL,
  chunk_idx INT NOT NULL,
  contenido TEXT NOT NULL,
  metadata JSONB NOT NULL,
  embedding vector(1024) NOT NULL,
  UNIQUE(slug, chunk_idx)
);
CREATE INDEX ON investigaciones_chunks USING ivfflat (embedding vector_cosine_ops);
```

Migración Alembic en `pipeline/db/migrations/20260509_investigaciones_chunks.py`.

### 4.3 Re-indexación

Hook simple: `make rag-reindex` corre `python -m pipeline.agents.rag.indexer --since=last_run`. Trigger opcional vía `post-commit` git hook que detecta cambios en `frontend/src/content/investigaciones/`.

### 4.4 Patrones de query

- **Agente A**: `corpus_search(query=brief, k=5)` → top chunks. Sirve como ejemplos de voz + contexto previo.
- **Agente C**: lectura directa del MDX por slug (sin RAG, es 1:1).

---

## 5. Estructura de código

```
pipeline/agents/
├── __init__.py
├── common/
│   ├── anthropic_client.py    # wrapper con caching helpers + logging
│   ├── ai_router_fallback.py  # adapter ai_router → mensaje OpenAI-style
│   ├── logging.py             # JSONL + DB row
│   └── schemas.py             # pydantic models para outputs
├── rag/
│   ├── indexer.py             # MDX → chunks → embeddings → pgvector
│   ├── retriever.py           # query + top-k
│   └── voyage_client.py
├── tools/
│   ├── kpi_lookup.py          # llama a /publico/carreras
│   ├── benchmark_lookup.py
│   ├── corpus_search.py
│   ├── source_lookup.py
│   ├── compute_stats.py
│   └── taxonomy_match.py
├── editorial_writer/          # Agente A
│   ├── agent.py
│   ├── prompts/
│   │   ├── system.md
│   │   ├── voice_guidelines.md
│   │   └── frontmatter_spec.md
│   └── cli.py                 # python -m pipeline.agents.editorial_writer.cli
├── research_analyst/          # Agente B
│   ├── agent.py
│   ├── prompts/system.md
│   └── cli.py
├── linkedin_synth/            # Agente C
│   ├── agent.py
│   ├── prompts/system.md
│   ├── few_shots/             # 8 por pillar
│   └── cli.py
└── logs/                      # gitignored, JSONL por día
```

Dependencias nuevas (`pipeline/requirements.txt`): `voyageai`, `pgvector`, `jsonschema`. `anthropic` ya está.

---

## 6. Integración al flujo del repo

| Trigger | Comando | Output |
|---|---|---|
| Nuevo MDX | `make agent-write TEMA="contaduría D1 sube"` | rama `agent/mdx-<slug>` con archivo en `frontend/src/content/investigaciones/draft-<slug>.mdx` + comentario al final con metadata JSON |
| Análisis paper | `make agent-research PDF=path/to/file.pdf` | `pipeline/agents/research_analyst/outputs/<sha>.json` + comentario con sugerencia YAML patch |
| LinkedIn post | `make agent-linkedin SLUG=2026-04-contaduria-ia-2030 PILLAR=diagnostico_semanal` | `pipeline/agents/linkedin_synth/outputs/<slug>-<pillar>.json` listo copy-paste |

**Revisión humana**: CLI imprime diff coloreado en terminal + abre archivo en `$EDITOR`. PR draft solo cuando se promueve `draft-*.mdx` → `<slug>.mdx` (script `make agent-promote SLUG=...`).

**Endpoint FastAPI** (fase 2): `POST /admin/agents/write` con auth admin, devuelve job_id + path. Útil cuando haya UI custom.

**Observabilidad**: tabla `agent_runs(id, agent, model, run_at, tokens_in, tokens_in_cached, tokens_out, cost_usd, input_hash, output_path, status, latency_ms, human_action)`. Vista `/admin/agents/runs` lee de aquí (fase 2).

---

## 7. Calendario (5–8 h/sem)

### Sprint 1 (semana 1–2) — **Agente C primero**

Razón: ROI inmediato, cero RAG, output verificable rápido (3–5 posts/sem). Construye los pipes comunes (`anthropic_client.py`, logging, CLI pattern) que A y B reusarán.

MVP: CLI que toma slug + pillar → imprime JSON. Sin endpoint, sin DB. Solo JSONL log.

### Sprint 2 (semana 3–4) — **RAG indexer + Agente A MVP**

- Indexar 88 MDX a pgvector.
- Agente A sin tools live: solo `corpus_search` + brief → MDX draft. Voz primero, datos manuales en brief.

### Sprint 3 (semana 5–6) — **Agente A v2 con tools**

- Agregar `kpi_lookup`, `benchmark_lookup`, `source_lookup`.
- Validador frontmatter + reintento.
- `make agent-promote`.

### Sprint 4 (semana 7–8) — **Agente B**

- Schema JSON output + 1 paper de prueba (WEF Future of Jobs 2025).
- `compute_stats` tool.
- Brief-for-writer handoff a Agente A.

### Iteraciones siguientes

- v3 A: Haiku editor pass de tono/typos.
- v2 B: watch-mode cron para fuentes RSS de WEF/McKinsey.
- v2 C: A/B testing de hooks (guardar engagement post-hoc).

---

## 8. Métricas de éxito (3 meses)

| Agente | Métrica 1 | Métrica 2 |
|---|---|---|
| A | Ratio aceptación drafts ≥ 70% (publicados sin reescritura mayor) | Tiempo revisión humana < 20 min/MDX |
| B | ≥ 80% findings con confianza alta+media validados manualmente | ≥ 1 YAML patch aceptado/mes |
| C | ≥ 4 posts/semana publicados | Engagement medio ≥ baseline humano (impressions+reactions) |

---

## 9. Riesgos top + mitigación

1. **Alucinación de métricas (A y B)**: tool `kpi_lookup` obligatorio para cualquier número; post-hoc regex que detecta % o cifras sin cita y bloquea publish. Eval suite con 20 briefs golden + LLM-judge.
2. **Drift de voz (A)**: golden set de 10 MDX humanos; cada release re-corre evaluador estilométrico (ratio adjetivos, longitud media oración, uso 1ª persona). Alerta si delta > 15%.
3. **Calidad LinkedIn cae al usar fallback ai_router (C)**: log proveedor usado; si Groq > 30% de los posts en una semana → alerta. Few-shots en español probados explícitamente con cada proveedor del fallback.

---

## 10. Costos mensuales estimados

Asunción: 12 MDX/mes (A), 4 reportes/mes (B), 16 posts/mes (C).

| Agente | $/invocación | Volumen | $/mes USD |
|---|---|---|---|
| A (Sonnet 4.6, cache caliente) | $0.05 | 12 | $0.60 |
| B (Opus 4.7 1M) | $0.25 | 4 | $1.00 |
| C (Haiku 4.5) | $0.008 | 16 | $0.13 |
| Embeddings (Voyage) re-index trimestral | — | — | $0.50 |
| **Total Claude API** | | | **~$2.30 USD/mes** |

Margen 5x para experimentación, evals y reintentos: **~$12 USD/mes ≈ $200 MXN/mes**.

Vs contratista humano $18–25k MXN/mes → **ahorro ~99%**, con throughput superior (12 MDX vs 4–6 humano).

---

## 11. Acción concreta para hoy

**Crear `pipeline/agents/common/anthropic_client.py`** — wrapper con caching helpers + logging JSONL. Es el bloque base que reusan los 3 agentes y desbloquea el MVP del Agente C esta semana.
