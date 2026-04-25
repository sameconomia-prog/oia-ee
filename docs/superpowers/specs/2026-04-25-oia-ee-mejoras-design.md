# OIA-EE — Plan de Mejoras: De MVP a Herramienta de Nivel Mundial

**Fecha:** 2026-04-25  
**Versión:** 1.0  
**Estrategia:** Salto cuántico — diferenciación temprana + fundamentos en paralelo  
**Horizonte:** 12 meses  
**Usuarios primarios:** Investigadores, policy makers (SEP, ANUIES, académicos)  
**Modelo de negocio:** Freemium híbrido institucional  
**Alcance geográfico:** México primero → LATAM → global  
**Killer feature:** Motor predictivo de tendencias de empleo educativo  

---

## Estado Actual (Diagnóstico)

**Stack:** FastAPI + PostgreSQL 16 (pgvector) + Next.js 14 (App Router) + Tailwind CSS  
**Tests:** 271 pasando (223 pytest + 48 Jest)  
**KPIs:** 7 dimensiones D1–D7 calculadas  
**Auth:** JWT 24h (sin refresh tokens)  
**Routers API:** 8 (publico, auth, noticias, kpis, admin, rector, alertas, escenarios)  
**Frontend:** 21 páginas + 40+ componentes  
**Jobs automáticos:** APScheduler (noticias 6h, alertas 3am, snapshot lunes 5am)  
**Scrapers:** NewsAPI + GDELT + RSS  
**Infra:** Docker + Railway (deploy pendiente)  

### Brechas críticas actuales

| Área | Problema |
|---|---|
| Seguridad | Sin rate limiting, CORS no hardened, JWT sin refresh |
| Cache | In-memory con TTL 5min (no distribuida) |
| pgvector | Instalado pero no usado (similarity search corre en Python) |
| RBAC | Solo vinculación usuario → IES, sin roles granulares |
| Email alertas | Stub sin implementar |
| CI/CD | Inexistente |
| Logging | Sin structlog ni Sentry |
| Tests E2E | Inexistentes |
| Predicción | Inexistente |
| API pública | Sin API keys, sin versioning |
| UI/UX | Funcional pero no transmite nivel mundial |
| Datos | Loaders parciales, fuentes no verificadas |

---

## Arquitectura de Datos Global

### Capas del sistema

```
INGESTA
  Grok API (xAI) + NewsAPI + GDELT + Layoffs.fyi + Scrapers MX
       ↓
  Claude Haiku → extrae JSON estructurado
       ↓
  Validación Pydantic estricta
       ↓
ALMACENAMIENTO
  PostgreSQL + pgvector  ←── fuente de verdad para analytics y API
       ↓ sync semanal         ↓ export mensual Parquet
  Obsidian vault          DuckDB (análisis exploratorio)
  (contexto narrativo)         ↓
                          Zenodo (DOI, datasets públicos)
CONSUMO
  OIA-EE Frontend (dashboards, visualizaciones)
  API pública (investigadores externos)
  SDKs Python/R
```

### Regla de asignación por capa

| Tipo de dato | Destino |
|---|---|
| Datos estadísticos (series, registros, métricas) | PostgreSQL |
| Contexto narrativo (noticias, eventos con historia) | PostgreSQL + Obsidian |
| Documentación metodológica de fuentes | Obsidian |
| Anomalías y notas de calidad de datos | Obsidian |
| Datasets públicos para investigadores | Parquet → Zenodo |
| Análisis exploratorio pesado | DuckDB (desde Parquet) |

---

## Pilar 0 — Fundamentos (Mes 1)

Lo que existe pero está roto o incompleto. Se ejecuta en paralelo con los demás pilares desde el primer mes.

### 0.1 Seguridad y autenticación

- **Rate limiting:** FastAPI Limiter + Redis. Tiers: `anon` 30/min, `researcher` 300/min, `premium` ilimitado
- **CORS hardening:** Lista blanca explícita de orígenes
- **JWT refresh tokens:** Access token 15min + Refresh token 30 días
- **RBAC completo:** Roles `viewer` / `researcher` / `admin_ies` / `superadmin`

### 0.2 Infraestructura

- **Redis:** Railway addon — cache distribuida, rate limiting, sesiones
- **pgvector activado:** Migrar `embedding_json` (string) a `vector(1536)` real, activar similarity search en queries
- **CI/CD:** GitHub Actions — lint + tests + deploy automático a Railway en merge a main
- **Logging:** structlog (JSON structured logs) + Sentry (errores) + Datadog o Grafana (métricas)
- **Email alertas:** Implementar con Resend (transaccional simple, buen DX)

### 0.3 Calidad de código

- **TypeScript strict mode** en todo el frontend
- **Tests E2E básicos:** Playwright para flujos críticos (login, dashboard KPIs, exportar CSV)
- **Pre-commit hooks:** Black + isort + mypy (backend), ESLint + Prettier (frontend)

### Entregables Pilar 0

- [ ] CI/CD pipeline en GitHub Actions
- [ ] Redis integrado como cache y rate limiter
- [ ] JWT refresh tokens funcionando
- [ ] RBAC con 4 roles
- [ ] pgvector activado para similarity search real
- [ ] Sentry configurado
- [ ] Email alertas con Resend
- [ ] Tests E2E básicos (5 flujos críticos)

---

## Pilar 1 — Motor Predictivo (Mes 2–3)

**El diferenciador global.** Ningún observatorio latinoamericano tiene capacidad predictiva.

### 1.1 Forecasting de obsolescencia por carrera

**Modelo:** `statsforecast` (Nixtla) — más rápido que Prophet, nativo para series múltiples  
**Input:** Serie histórica D1 por carrera × estado + vacantes mensuales + datos IMSS trimestrales  
**Output:** Predicción 3–5 años con intervalos de confianza 80% / 95%  
**Granularidad:** carrera × estado × IES  

**Nuevo schema PostgreSQL:**
```sql
CREATE TABLE predicciones_kpi (
  id SERIAL PRIMARY KEY,
  entidad_tipo VARCHAR(20),        -- 'carrera', 'ies', 'estado'
  entidad_id INTEGER,
  kpi_nombre VARCHAR(10),          -- 'D1', 'D2', ...
  horizonte_años INTEGER,          -- 1, 3, 5
  fecha_prediccion DATE,           -- fecha del punto predicho
  valor_predicho FLOAT,
  ci_80_lower FLOAT,
  ci_80_upper FLOAT,
  ci_95_lower FLOAT,
  ci_95_upper FLOAT,
  modelo_version VARCHAR(20),
  fecha_generacion TIMESTAMP DEFAULT NOW()
);
```

**Job:** Semanal (domingo 4am) — corre statsforecast para todas las carreras con >8 puntos históricos.

### 1.2 Motor de demanda de habilidades

- Analizar vacantes actuales → Claude Haiku extrae skills (ya existe parcialmente)
- Proyectar tendencia de cada skill: creciente / estable / declinante
- Actualización semanal de `skills_emergentes`
- Output para IES: "Estas 5 skills crecen >30% en tu sector — no están en tu plan de estudios"

### 1.3 Índice de riesgo de automatización dinámico

Actualmente D1 usa solo datos ONET (estáticos, anuales). Mejorar con:
- Eventos de despidos por IA del Radar (P8) — actualización continua
- Ratio vacantes/egresados en tiempo real (ya calculado)
- Tendencia salarial por ocupación (IMSS mensual)
- Output: score dinámico que cambia mensualmente, no anualmente

### 1.4 Dashboard predictivo

- **Gráfica de fan:** serie histórica D1 + proyección + bandas de confianza coloreadas
- **Comparativa escenarios:** "Tendencia actual" vs "Si la IES actualiza plan de estudios"
- **Semáforo predictivo:** verde/amarillo/rojo para 1, 3 y 5 años
- **Exportación:** PNG, SVG, CSV con intervalos
- **Endpoint:** `GET /api/v1/predicciones/carrera/{id}?horizonte=3&confianza=95`

### 1.5 Backtesting automático

- Cada trimestre: comparar predicciones pasadas vs realidad observada
- Métricas: MAPE, RMSE por carrera
- Dashboard de precisión del modelo visible en admin
- Si MAPE > 20%, alerta para revisión del modelo

---

## Pilar 2 — Datos Enriquecidos (Mes 2–4)

El motor predictivo necesita datos reales de calidad.

### 2.1 Fuentes oficiales mexicanas

| Fuente | Datos clave | Integración | Frecuencia |
|---|---|---|---|
| IMSS Microscopio Laboral | Empleo formal, salarios por sector/estado | API REST pública | Mensual |
| INEGI ENOE | Ocupación, desempleo, informalidad | CSV automático | Trimestral |
| ANUIES | Matrícula completa, egresados, programas | Scraping + CSV | Anual |
| STPS | Vacantes formales, brechas salariales | Loader completar | Mensual |
| SEP 911 | Estadísticas educativas por IES | CSV + API SEP | Anual |
| ENILEMS | Habilidades de la fuerza laboral | Microdatos INEGI | Bianual |

### 2.2 Scrapers de empleo mejorados

| Fuente | Estado | Plan |
|---|---|---|
| OCC Mundial | Loader existe | Completar: rate limiting + proxies + normalización |
| Indeed México | No existe | Scraper con Playwright + Bright Data proxy |
| LinkedIn Jobs | No existe | Scraper ético (respetar ToS) o API oficial |
| Computrabajo | No existe | Scraper básico |
| Bumeran | No existe | Scraper básico |

**Infraestructura de scrapers:**
- Clase base `RobustScraper`: retry exponencial, backoff, rotación User-Agent
- Proxy pool (Bright Data) para fuentes que bloquean
- Deduplicación por embedding de título + empresa + fecha
- Rate limiting respetuoso por dominio

### 2.3 Pipeline de calidad de datos

- Validación Pydantic v2 estricta en ingesta (tipos, rangos, coherencia)
- Deduplicación de vacantes: cosine similarity > 0.92 en embedding = duplicado
- Dashboard de salud de datos (admin): última actualización por fuente, registros nuevos, anomalías
- Alertas automáticas: si fuente no actualiza en N días → email a admin
- Versionado de datasets: fecha de corte visible en UI y API

### 2.4 Normalización geográfica

- Tabla `geo_municipios`: clave INEGI, nombre oficial, estado, lat/lng centroide
- Geocoding de vacantes: normalizar ciudad → municipio → estado → clave INEGI
- Cobertura target: 32 estados + 59 zonas metropolitanas CONAPO

### 2.5 Obsidian — Documentación de fuentes (no los datos)

Una nota por fuente oficial en `vault/OIA-EE/fuentes-datos/`:

```markdown
---
fuente: IMSS Microscopio Laboral
url_oficial: https://imss.gob.mx/microscopio
ultima_actualizacion: 2026-04-01
frecuencia: mensual
registros_actuales: 4823901
tags: [empleo-formal, salarios, sectores]
---
## Descripción
## Limitaciones conocidas
## Cambios metodológicos (con fechas)
## Links de evidencia (releases oficiales)
## Anomalías detectadas (con fecha y descripción)
```

---

## Pilar 3 — API Pública y Open Data (Mes 3–5)

Para que investigadores del mundo puedan usar OIA-EE como fuente de datos.

### 3.1 API pública documentada

- **OpenAPI 3.1** completa, auto-generada por FastAPI
- **Autenticación:** API keys (no solo JWT) — self-service en portal
- **Rate limiting por tier:**
  - `anon`: 30 req/min, datos agregados
  - `researcher`: 300 req/min, datos desagregados + predicciones
  - `premium`: ilimitado + soporte + SLA
- **Versioning:** `/api/v1/` (actual) → `/api/v2/` (breaking changes)
- **Documentación interactiva:** Scalar (mejor UX que Swagger UI)

### 3.2 Endpoints nuevos para investigadores

```
GET  /api/v1/datasets/                    Catálogo de datasets descargables
GET  /api/v1/datasets/kpis                Serie histórica D1-D7 completa
GET  /api/v1/datasets/vacantes            Vacantes agregadas carrera×estado×mes
GET  /api/v1/datasets/skills              Tendencias de skills emergentes
GET  /api/v1/datasets/radar-despidos      Eventos de desplazamiento por IA
GET  /api/v1/predicciones/               Forecasts con intervalos de confianza
GET  /api/v1/predicciones/carrera/{id}   Forecast específico por carrera
GET  /api/v1/metodologia/                 Docs de cálculo de KPIs
GET  /api/v1/metodologia/kpis/{d}         Fórmula y fuentes de dimensión D1-D7
POST /api/v1/escenarios/batch             Simulaciones batch (hasta 100 escenarios)
GET  /api/v1/radar/despidos              Eventos globales desplazamiento IA
GET  /api/v1/radar/empleos               Empleos nuevos generados por IA
GET  /api/v1/radar/skills                Skills emergentes con tendencia
```

### 3.3 Open datasets

- **Formato:** Parquet (primario) + CSV (accesibilidad) + codebook (diccionario de variables)
- **Frecuencia:** Release mensual
- **Publicación:** Zenodo — DOI citable por release
- **Licencia:** CC BY 4.0
- **Versionado:** Semántico (1.0.0, 1.1.0...)
- **Compatibilidad:** pandas, polars, R (haven), Julia, Stata, SPSS
- **CHANGELOG** por release

### 3.4 Portal del desarrollador

- Página `/developers` con: documentación, API keys, ejemplos de código
- Ejemplos en Python y R para queries más comunes
- Guías: "Cómo reproducir el Índice D1", "Cómo descargar datos de vacantes"
- Sandbox: dataset de muestra con IES ficticias + datos reales de estructura

---

## Pilar 4 — UI/UX Profesional (Mes 3–5)

El rediseño más importante para transmitir nivel mundial.

### 4.1 Sistema de diseño

- **Paleta:** Profesional/institucional — azul profundo, gris oscuro, acentos en ámbar (alertas) y verde (oportunidades)
- **Tipografía:** Inter para UI + JetBrains Mono para datos numéricos
- **Componentes:** shadcn/ui como base + design tokens propios
- **Modo oscuro:** Completo, persistido en localStorage
- **Accesibilidad:** WCAG 2.1 AA — contraste, navegación por teclado, ARIA labels

### 4.2 Dashboard ejecutivo nacional (policy makers)

- **Hero:** Mapa choropleth interactivo de México — color por D1 promedio estatal
- **Click en estado:** Drill-down a carreras y IES del estado
- **Métricas nacionales:** Total egresados en riesgo, total vacantes IA, ahorro salarial acumulado por IA
- **Top 10 carreras en riesgo** + **Top 10 con mayor oportunidad** (togglable)
- **Línea temporal:** Evolución D1 nacional mensual (últimos 24 meses)
- **Panel predictivo:** "En 3 años, estas carreras estarán en riesgo crítico"

### 4.3 Dashboard por IES (tier premium)

- **Scorecard:** D1–D7 vs promedio nacional vs promedio estatal vs IES similar
- **Semáforo predictivo** a 1/3/5 años
- **Alertas activas:** Con severidad, descripción y recomendación accionable
- **Simulador de escenarios:** UX visual mejorado — sliders para parámetros D1/D2
- **Exportación:** PDF ejecutivo con branding IES (logo, colores, nombre rector)

### 4.4 Visualizaciones nuevas

| Visualización | Librería | Descripción |
|---|---|---|
| Mapa choropleth México | `react-simple-maps` + TopoJSON | D1/D2 por estado, clickeable |
| Gráfica de fan | Recharts custom | Serie histórica + proyección + bandas CI |
| Bubble chart carreras | `@visx/scale` + SVG | X: riesgo, Y: oportunidad, tamaño: matrícula |
| Sankey egresados | `d3-sankey` | Egresados → sector de empleo → trayectoria |
| Heatmap skills | `@visx/heatmap` | Skills × mes, intensidad = demanda |
| Radar chart IES | Recharts Radar | D1–D7 en polígono, comparativa multi-IES |

### 4.5 Experiencia para investigadores

- **Query builder visual:** Filtros avanzados (carrera, estado, IES, año, tipo) sin código
- **Preview de dataset:** Ver primeras 50 filas antes de descargar
- **Cita automática:** Botón "Citar este dataset" → APA, BibTeX, RIS
- **Historial de descargas:** Por usuario registrado

---

## Pilar 5 — Benchmarking Avanzado (Mes 4–6)

### 5.1 Comparativa multi-IES

- Comparar hasta 4 IES simultáneamente (actualmente solo 2)
- Dimensiones comparables: D1–D7, matrícula, egresados, vacantes, tasa inserción
- Ranking automático: posición nacional y estatal por dimensión
- "Mejor IES similar": clustering K-means por tipo (pública/privada), tamaño, región

### 5.2 Rankings publicados

- Ranking nacional de carreras por empleabilidad (D1 + D2 + tasa inserción)
- Ranking estatal de IES por preparación digital
- Ranking de programas con mayor crecimiento de demanda laboral
- Publicación semestral como **"Reporte OIA-EE — Estado de la Empleabilidad en México"**

### 5.3 Benchmarking internacional (Mes 8+)

- Comparar México vs BLS (EEUU), OCDE, Eurostat en métricas equivalentes
- Índice de brecha de habilidades vs economías comparables
- Posición de México en preparación digital de fuerza laboral

---

## Pilar 6 — Seguimiento Longitudinal (Mes 5–8)

El pilar más difícil pero más valioso para investigación.

### 6.1 Integración IMSS anonimizada

- Cruzar cohortes egresados ANUIES (año × carrera × estado) con afiliados IMSS (sector, salario)
- Sin PII: solo agregados por cohorte
- Output: tasa de inserción formal a 6/12/24 meses post-egreso
- **Requiere:** Convenio formal con IMSS o STPS — gestión institucional prioritaria

### 6.2 Encuesta de seguimiento de egresados

- Módulo de encuesta integrado en OIA-EE
- IES invita egresados → responden en plataforma (incentivo: certificado de perfil laboral)
- Datos recolectados: empleo actual, salario, área, habilidades más usadas, satisfacción
- Privacidad: datos individuales nunca expuestos, solo agregados por cohorte

### 6.3 Análisis de trayectorias

- Sankey: egresados → primer empleo (sector) → 2/5 años después
- Salario promedio a 1/3/5 años por carrera × IES
- % que trabaja en área de formación (alineación carrera-empleo)
- Comparativa por generación de egreso

---

## Pilar 7 — Investigación y Academia (Mes 6–10)

Para convertirse en referencia académica internacional.

### 7.1 Reportes automáticos

- **Reporte mensual por estado:** PDF generado con WeasyPrint — estadísticas, tendencias, alertas top 5
- **Reporte semestral nacional:** "Estado de la Empleabilidad en México" — 30–40 páginas
- **Distribución:** Email automático a suscriptores registrados (Resend)

### 7.2 Dataset releases académicos

- **Zenodo DOI** por release trimestral
- Formato: Parquet + CSV + codebook completo
- Compatible con pandas, R (haven), Stata, SPSS, Julia
- Versionado semántico + CHANGELOG detallado

### 7.3 Herramientas de citación y reproducibilidad

- Perfil ORCID para investigadores registrados
- Módulo "Reproduce este análisis": código Python/R de ejemplo + datos exactos usados
- Exportación LaTeX: tablas y figuras listas para artículo académico
- Citación automática: APA, BibTeX, RIS por dataset y por análisis específico

---

## Pilar 8 — Radar de Impacto IA (Transversal, Mes 1–12)

El sistema de inteligencia más valioso. Activo desde el primer mes, sus datos alimentan al motor predictivo, la API, el UI y los reportes académicos.

### 8.1 Arquitectura del Radar

```
Grok API (xAI) — búsqueda diaria en X + web
  + NewsAPI — noticias formales globales
  + Layoffs.fyi — tech industry, muy preciso
  + El Economista / Expansión — México
  + RSS: TechCrunch, Reuters, BBC Business
       ↓
  Filtro por keywords relevantes
  (EN: "layoffs AI", "automation replaces workers", "AI job cuts")
  (ES: "despidos IA", "automatización empleos", "sustitución laboral")
       ↓
  Claude Haiku → JSON estructurado
       ↓
  Validación Pydantic
       ↓
  PostgreSQL (analytics)  +  Obsidian vault (evidencia narrativa)
```

### 8.2 Radar de Desplazamiento Laboral

**Tabla `eventos_ia_despidos`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `empresa` | VARCHAR | Nombre de la empresa |
| `sector` | VARCHAR | SCIAN / clasificación propia |
| `pais` | CHAR(2) | ISO 3166 |
| `fecha_anuncio` | DATE | Fecha del anuncio |
| `fecha_captura` | DATE | Fecha de ingesta |
| `numero_despidos` | INTEGER | Empleos eliminados (o rango_min/max si es estimado) |
| `salario_promedio_usd` | FLOAT | Estimado de mercado |
| `ahorro_anual_usd` | FLOAT | `despidos × salario × 12` |
| `ia_tecnologia` | VARCHAR | ChatGPT, Copilot, Vision AI, custom... |
| `area_reemplazada` | VARCHAR | Customer service, coding, legal review... |
| `porcentaje_fuerza_laboral` | FLOAT | % del headcount total |
| `es_reemplazo_total` | BOOLEAN | Sustitución total vs parcial |
| `fuente_url` | TEXT | URL original (evidencia) |
| `fuente_nombre` | VARCHAR | Reuters, Layoffs.fyi... |
| `confiabilidad` | ENUM | alta (anuncio oficial) / media / baja |
| `resumen_haiku` | TEXT | Análisis generado por Claude Haiku |
| `embedding` | VECTOR(1536) | pgvector para búsqueda semántica |

**Prompt de extracción Claude Haiku:**
```
Extrae de esta noticia los siguientes campos en JSON:
empresa, pais (ISO 3166), sector, fecha_anuncio (YYYY-MM-DD),
numero_despidos (integer o null si no se menciona),
rango_min_despidos, rango_max_despidos (si se da rango),
salario_promedio_usd (estimado mercado o null),
ia_tecnologia (nombre específico o "IA genérica"),
area_reemplazada (área de trabajo específica),
porcentaje_fuerza_laboral (float 0-1 o null),
es_reemplazo_total (boolean),
confiabilidad ("alta" si hay comunicado oficial, "media" si es reporteo, "baja" si es especulación).
Si un campo no está disponible, usa null.
Responde SOLO con el JSON, sin texto adicional.
```

### 8.3 Radar de Empleos Generados por IA

**Tabla `eventos_ia_empleos`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `empresa` | VARCHAR | |
| `sector` | VARCHAR | |
| `pais` | CHAR(2) | |
| `fecha_anuncio` | DATE | |
| `fecha_captura` | DATE | |
| `numero_empleos` | INTEGER | Empleos nuevos creados |
| `tipo_contrato` | ENUM | permanente / temporal / freelance |
| `titulo_puesto` | VARCHAR | AI Engineer, Prompt Engineer... |
| `habilidades_requeridas` | JSONB | `["Python", "LLMs", "RAG"]` |
| `salario_min_usd` | FLOAT | |
| `salario_max_usd` | FLOAT | |
| `ia_tecnologia_usada` | VARCHAR | Qué IA usan en este puesto |
| `fuente_url` | TEXT | URL original (evidencia) |
| `fuente_nombre` | VARCHAR | |
| `confiabilidad` | ENUM | alta / media / baja |
| `resumen_haiku` | TEXT | |
| `embedding` | VECTOR(1536) | |

### 8.4 Intelligence de Skills Emergentes

**Tabla `skills_emergentes`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `skill` | VARCHAR | Python, Prompt Engineering, RAG... |
| `categoria` | ENUM | tecnica / blanda / dominio / herramienta |
| `menciones_30d` | INTEGER | Frecuencia últimos 30 días |
| `tendencia_90d` | ENUM | creciente / estable / decreciente |
| `velocidad_crecimiento_pct` | FLOAT | % cambio mes a mes |
| `sectores_demandantes` | JSONB | `{"fintech": 23, "salud": 18}` |
| `paises_demandantes` | JSONB | `{"mx": 45, "us": 230}` |
| `salario_premium_pct` | FLOAT | % adicional en salario por tenerla |
| `primera_mencion_fecha` | DATE | Señal de cuándo emergió |

**Job semanal:** Reagregar menciones de vacantes + eventos → actualizar tendencias. Alerta si skill nueva sube >50% en 30 días.

### 8.5 Integración Obsidian — Capa de Evidencia

**Estructura del vault:**
```
vault/OIA-EE/
├── radar-despidos/
│   ├── 2025-04-20-samsung-vision-ai.md
│   ├── 2025-03-15-ibm-watson-accounting.md
│   └── ...
├── radar-empleos/
│   ├── 2025-04-18-openai-prompt-engineers.md
│   └── ...
├── fuentes-datos/
│   ├── IMSS-microscopio-laboral.md
│   ├── INEGI-ENOE.md
│   ├── ANUIES-estadisticas.md
│   └── ...
```

**Frontmatter para eventos del radar:**
```yaml
---
tipo: despido_ia
empresa: Samsung Electronics
sector: manufactura
pais: KR
fecha_anuncio: 2025-04-20
fecha_captura: 2025-04-21
fuente_url: https://reuters.com/article/samsung-layoffs-ai-quality-control
fuente_nombre: Reuters
confiabilidad: alta
numero_despidos: 2000
ia_tecnologia: Vision AI (sistema propio)
area_reemplazada: control de calidad visual
ahorro_anual_usd: 120000000
tags: [despidos, manufactura, vision-ai, corea-del-sur]
---
```

**Frontmatter para fuentes de datos P2:**
```yaml
---
fuente: IMSS Microscopio Laboral
tipo: fuente_oficial
url_oficial: https://imss.gob.mx/microscopio
ultima_actualizacion: 2026-04-01
frecuencia: mensual
registros_actuales: 4823901
tags: [empleo-formal, salarios, sectores]
---
## Descripción
## Limitaciones conocidas
## Cambios metodológicos (con fechas)
## Links de evidencia
## Anomalías detectadas
```

**Job semanal:** Script Python lee nuevos eventos en PostgreSQL → genera/actualiza notas Obsidian → git commit al vault.

### 8.6 Dashboards del Radar

**Dashboard 1 — Balance global IA:**
- Línea temporal: despidos acumulados vs empleos creados (mensual)
- Por sector: net positivo vs net negativo
- Por país: heatmap mundial de impacto neto
- Por tecnología: qué IA desplaza más vs cuál crea más

**Dashboard 2 — Heatmap de skills para IES:**
- Tabla: skill × demanda × tendencia × salario premium
- Filtros: país, sector, nivel (junior/senior)
- Tagline: "Las 20 skills que toda universidad debería enseñar ahora"
- Actualización semanal

**Dashboard 3 — Ahorro salarial global:**
- Total acumulado calculado (despidos × salario estimado × 12)
- Top empresas por ahorro
- Proyección: "A este ritmo, en 2028 las empresas habrán ahorrado $X billones"

**Dashboard 4 — Recomendaciones automáticas para IES:**
- Basado en skills_emergentes: "Añadir Python a plan de estudios de Contaduría"
- Basado en despidos × sector × país: "El sector BPO en México está en riesgo crítico"
- Revisión: alertas accionables con botón de descarte o marcar como atendida

---

## Hoja de Ruta — 12 Meses

```
MES 1
  P0: CI/CD, Redis, JWT refresh, RBAC, pgvector real, Sentry, email alertas
  P8: Radar v1 — Grok API + Haiku pipeline, tablas eventos_ia, Obsidian sync

MES 2
  P1: statsforecast setup, job de predicciones, tabla predicciones_kpi
  P2: IMSS API, INEGI ENOE CSV automático, ANUIES completo

MES 3
  P1: Dashboard predictivo — gráficas de fan, semáforo, exportación
  P3: API pública beta — OpenAPI, API keys self-service, rate limiting tiers
  P2: Scrapers OCC + Indeed mejorados, pipeline de calidad

MES 4
  P4: Sistema de diseño + mapa choropleth México + bubble chart
  P3: Open datasets — Parquet release mensual, Zenodo DOI primer release
  P5: Benchmarking multi-IES, ranking nacional v1

MES 5
  P4: Dashboard ejecutivo nacional completo + dashboard IES + reporte PDF
  P5: Ranking estatal + "Mejor IES similar" (clustering)
  P8: Dashboard balance global IA + heatmap skills

MES 6
  P6: Encuesta egresados — módulo integrado
  P7: Reporte PDF mensual automático por estado
  P3: SDK Python v0.1 + portal developer completo

MES 7–8
  P5: Benchmarking internacional (BLS, OCDE, Eurostat)
  P6: Integración IMSS anonimizada (si convenio disponible)
  P8: Dashboard recomendaciones automáticas para IES
  P4: Modo oscuro completo + accesibilidad WCAG 2.1

MES 9–10
  P7: Dataset releases con DOI + codebook + versionado semántico
  P3: SDK R v0.1
  P7: Módulo reproducibilidad + exportación LaTeX

MES 11–12
  Primera IES de otro país (arquitectura multi-país)
  P7: Reporte semestral nacional v1 — "Estado de la Empleabilidad en México"
  P5: Benchmarking LATAM
```

---

## Tecnologías Nuevas a Agregar

| Tecnología | Propósito | Pilar |
|---|---|---|
| Redis | Cache distribuida + rate limiting | P0 |
| Sentry | Error tracking | P0 |
| Resend | Email transaccional | P0 |
| Grok API (xAI) | News intelligence en tiempo real | P8 |
| Claude Haiku | Extracción estructurada de noticias | P8 |
| statsforecast | Time-series forecasting | P1 |
| DuckDB | Análisis exploratorio de datasets | P2/P3 |
| Zenodo | Publicación DOI de datasets | P3/P7 |
| react-simple-maps | Mapa choropleth de México | P4 |
| @visx | Visualizaciones avanzadas (Sankey, heatmap) | P4 |
| Scalar | Documentación API interactiva | P3 |
| WeasyPrint | Generación PDF reportes | P7 |
| Playwright | Tests E2E | P0 |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Convenio IMSS bloqueado | Alta | Encuesta egresados como alternativa (P6.2) |
| Grok API cambia precio/ToS | Media | NewsAPI + GDELT como fallback |
| Calidad de datos ANUIES inconsistente | Alta | Pipeline de validación + notas Obsidian por anomalía |
| Motor predictivo con MAPE alto | Media | Backtesting trimestral + alerta para revisión |
| Scrapers bloqueados | Media | Rotación de proxies + User-Agent + rate limiting respetuoso |
| Deuda técnica acumulada | Alta | P0 corre en paralelo, no secuencial |

---

## KPIs del Proyecto (cómo medimos éxito)

| Métrica | Meta 6 meses | Meta 12 meses |
|---|---|---|
| IES con datos completos | 500 | 2,000 (cobertura nacional) |
| API requests/mes (externos) | 10,000 | 100,000 |
| Investigadores registrados | 50 | 500 |
| Datasets descargados (Zenodo) | 200 | 2,000 |
| Eventos radar IA indexados | 500 | 5,000 |
| Skills emergentes monitoreadas | 200 | 1,000 |
| Precisión motor predictivo (MAPE) | <25% | <15% |
| Tests con cobertura | >70% | >85% |
| Uptime plataforma | >99% | >99.5% |

---

## Decisiones de Arquitectura Tomadas

1. **PostgreSQL como fuente de verdad** para analytics y API (no Obsidian)
2. **Obsidian como bóveda narrativa**: eventos del radar (con URL + fechas) y docs metodológicas de fuentes
3. **Grok API (xAI)** como fuente primaria de noticias por acceso real-time a X + web
4. **Claude Haiku** para extracción estructurada en bulk (costo/velocidad óptimos)
5. **DuckDB** para análisis exploratorio sin tocar producción
6. **Parquet → Zenodo** como pipeline de publicación académica
7. **statsforecast** sobre Prophet (más rápido para múltiples series)
8. **Freemium híbrido**: capa pública (anon API key) + premium institucional (RBAC)
9. **México primero**: toda la arquitectura geográfica preparada para multi-país desde mes 12
