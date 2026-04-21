# OIA-EE — Diseño del Sistema (Design Spec)
**Fecha:** 2026-04-20  
**Estado:** COMPLETO — pendiente aprobación final del usuario  
**Proyecto:** Radar de Impacto IA en Educación y Empleo  
**Stack:** Python + PostgreSQL + pgvector + FastAPI + Next.js 14  

---

## 1. Arquitectura Global

```
┌─────────────────────────────────────────────────────────────────┐
│                     FUENTES DE DATOS                            │
│  RSS·GDELT·NewsAPI·layoffs.fyi │ STPS·ONET·ILOSTAT·OCC         │
│  ANUIES·SEP·WEF               │ Claude API (clasificador)       │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              ETL PIPELINE (Python · APScheduler)                │
│  news_scraper.py │ jobs_pipeline.py │ education_loader.py       │
│  kpi_engine.py   │ university_analyzer.py │ scenario_engine.py  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│           BASE DE DATOS (PostgreSQL + pgvector)                 │
│  noticias · vacantes · ocupaciones · ies · carreras             │
│  carrera_ies · kpi_historico · alertas · escenarios             │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              API (FastAPI · Python)                             │
│  /carreras · /ies · /noticias · /mercado · /escenarios         │
│  /gobierno · /nuevas-carreras · /universidad/analisis           │
└─────────────────┬───────────────────────────────────────────────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
┌──────────────────┐  ┌──────────────────────┐
│ Next.js Frontend │  │ API Pública / Clientes│
│ · Dashboard IES  │  │ · IES via API privada │
│ · Vista estudiante│  │ · Gobiernos / BID    │
│ · Panel gobierno │  │ · Investigadores      │
│ · Monitor noticias│  └──────────────────────┘
└──────────────────┘
```

**Deploy:** Railway (pipeline + PostgreSQL) · Vercel (frontend) · Costo: ~$20/mes MVP

---

## 2. Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Scrapers | Playwright · httpx · feedparser | Navegación · REST · RSS |
| ETL | pandas · numpy · APScheduler | Transformación · scheduling |
| KPI Engine | scikit-learn · statsmodels | ML · correlaciones · scoring |
| Clasificador IA | Claude API (Haiku) | Clasificar noticias · extraer entidades |
| Embeddings | pgvector + API embeddings | Búsqueda semántica de noticias |
| API | FastAPI · SQLAlchemy · Pydantic · Alembic | REST · ORM · validación · migraciones |
| Base de datos | PostgreSQL 16 + pgvector | Datos estructurados + vectores |
| Frontend | Next.js 14 (App Router) · TypeScript | SSR · routing |
| UI | Tailwind CSS · shadcn/ui | Componentes |
| Charts | Recharts | Gráficas interactivas |
| Mapa | Mapbox GL JS | Mapa de calor por estado/país |
| Generación PDF | Claude API + WeasyPrint | Reportes ejecutivos |

---

## 3. Estructura del Repositorio

```
oia-ee/
├── pipeline/                    # Python — ETL + KPI Engine
│   ├── scrapers/
│   │   ├── news_scraper.py      # RSS + GDELT + NewsAPI + layoffs.fyi
│   │   ├── jobs_scraper.py      # OCC Mundial (Playwright)
│   │   └── base_scraper.py     # Clase base con rate limiting
│   ├── loaders/
│   │   ├── stps_loader.py      # STPS Observatorio Laboral CSV
│   │   ├── onet_loader.py      # ONET Web Services API
│   │   ├── ilostat_loader.py   # ILOSTAT API (OIT)
│   │   ├── anuies_loader.py    # ANUIES CSV anual
│   │   ├── sep_loader.py       # SEP / datos.gob.mx
│   │   └── wef_loader.py       # WEF Future of Jobs CSV
│   ├── kpi_engine/
│   │   ├── d1_obsolescencia.py # IVA · P_aut · BES · VAC
│   │   ├── d2_oportunidades.py # IOE · IHE · IEA · VNC
│   │   ├── d3_mercado.py       # TDM · TVC · BRS · ICE
│   │   ├── d4_institucional.py # IRF · TRA · CAD · ICV · ISR · PAE · ΔEBITDA · ICP · ROI-R · TAI · IRP
│   │   ├── d5_geografia.py     # IDR · ICG · IES_S
│   │   ├── d6_estudiantil.py   # IEI · CRC · ROI-E
│   │   ├── d7_noticias.py      # ISN · VDM
│   │   └── kpi_runner.py       # Orquesta cálculo de todos los KPIs
│   ├── university_analyzer/
│   │   ├── risk_scorer.py      # Score de riesgo por carrera × IES
│   │   ├── new_careers.py      # Detección de nuevas carreras emergentes
│   │   ├── skills_gap.py       # BES detallado por carrera
│   │   └── alert_generator.py  # Genera alertas automáticas
│   ├── scenario_engine/
│   │   ├── ramp_up.py          # Proyección con acciones (PAE + ΔEBITDA)
│   │   ├── ramp_down.py        # Proyección sin acciones
│   │   └── scenario_runner.py  # Orquesta ambos escenarios
│   ├── utils/
│   │   ├── claude_client.py    # Cliente Claude API (clasificación + embeddings)
│   │   ├── career_normalizer.py# Normaliza nombres de carreras con fuzzy match
│   │   ├── sector_mapper.py    # Mapea ocupaciones ONET → sector SCIAN
│   │   └── rate_limiter.py     # Rate limiting para scrapers
│   ├── db/
│   │   ├── models.py           # SQLAlchemy ORM models
│   │   ├── migrations/         # Alembic migrations
│   │   └── seed.py             # Datos iniciales (ANUIES, ONET)
│   ├── scheduler.py            # APScheduler — define todos los cron jobs
│   └── requirements.txt
│
├── api/                         # FastAPI — API REST
│   ├── routers/
│   │   ├── carreras.py         # GET /carreras/{id}/riesgo
│   │   ├── ies.py              # GET /ies/{id}/dashboard
│   │   ├── noticias.py         # GET /noticias/stream + búsqueda semántica
│   │   ├── mercado.py          # GET /mercado/skills · /mercado/sectores
│   │   ├── escenarios.py       # GET+POST /escenarios (ramp-up/ramp-down)
│   │   ├── gobierno.py         # GET /gobierno/nacional · /estados · /sectores
│   │   └── herramientas.py     # POST /universidad/analisis · /reporte-pdf
│   ├── models/
│   │   ├── schemas.py          # Pydantic schemas (request/response)
│   │   └── responses.py        # Response models tipados
│   ├── services/
│   │   ├── kpi_service.py      # Calcula KPIs on-demand
│   │   ├── report_service.py   # Genera PDF con Claude + WeasyPrint
│   │   └── alert_service.py    # Gestiona alertas de usuarios
│   ├── main.py                 # FastAPI app + routers
│   ├── config.py               # Settings (env vars)
│   └── requirements.txt
│
├── frontend/                    # Next.js 14 — Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Home — buscador estudiante
│   │   │   ├── carrera/[id]/    # Vista detalle carrera
│   │   │   ├── ies/[id]/        # Dashboard rector
│   │   │   ├── gobierno/        # Panel de política pública
│   │   │   ├── noticias/        # Monitor de noticias
│   │   │   └── api/             # Next.js API routes (proxy)
│   │   └── components/
│   │       ├── dashboard/       # Componentes del dashboard rector
│   │       ├── student/         # Componentes vista estudiante
│   │       ├── gobierno/        # Componentes panel gobierno
│   │       ├── charts/          # Recharts wrappers
│   │       ├── map/             # Mapbox GL wrapper
│   │       └── ui/              # shadcn/ui components
│   ├── package.json
│   └── tailwind.config.ts
│
├── infra/
│   ├── docker-compose.yml      # Dev local: PostgreSQL + pgvector + pipeline + API
│   ├── railway.toml            # Deploy pipeline + DB en Railway
│   └── vercel.json             # Deploy frontend en Vercel
│
├── docs/
│   └── superpowers/specs/
│       └── 2026-04-20-oia-ee-design.md  # Este archivo
│
├── .env.example                # Variables de entorno documentadas
├── .gitignore
└── README.md
```

---

## 4. Esquema de Base de Datos (PostgreSQL)

```sql
-- Noticias procesadas con Claude + embeddings
CREATE TABLE noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  fuente VARCHAR(50),         -- 'rss_techcrunch', 'gdelt', 'newsapi', 'layoffs_fyi'
  fecha_pub TIMESTAMPTZ,
  fecha_ingesta TIMESTAMPTZ DEFAULT NOW(),
  sector VARCHAR(100),        -- clasificado por Claude
  pais VARCHAR(50),
  tipo_impacto VARCHAR(30),   -- 'despido_masivo' | 'adopcion_ia' | 'nueva_carrera' | 'regulacion'
  n_empleados_afectados INT,
  empresa TEXT,
  causa_ia TEXT,              -- extracto: qué rol de IA causó el impacto
  resumen_claude TEXT,        -- resumen 2-3 líneas generado por Claude
  embedding vector(1536),     -- para búsqueda semántica
  raw_content TEXT
);
CREATE INDEX ON noticias USING ivfflat (embedding vector_cosine_ops);

-- Vacantes scrapeadas de OCC + otras fuentes
CREATE TABLE vacantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  empresa TEXT,
  sector VARCHAR(100),
  skills TEXT[],              -- lista normalizada de habilidades requeridas
  salario_min INT,            -- MXN/mes
  salario_max INT,
  fecha_pub DATE,
  fuente VARCHAR(30),
  pais VARCHAR(50) DEFAULT 'México',
  estado VARCHAR(100),
  nivel_educativo VARCHAR(50),
  experiencia_anios SMALLINT,
  raw_json JSONB
);

-- Ocupaciones ONET con datos de automatizabilidad
CREATE TABLE ocupaciones (
  onet_code VARCHAR(10) PRIMARY KEY,
  nombre TEXT NOT NULL,
  p_automatizacion DECIMAL(4,3),  -- Frey-Osborne [0,1]
  p_augmentacion DECIMAL(4,3),
  skills TEXT[],
  tareas TEXT[],
  sector VARCHAR(100),
  salario_mediana_usd INT
);

-- Instituciones educativas
CREATE TABLE ies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave_sep VARCHAR(20) UNIQUE,
  nombre TEXT NOT NULL,
  nombre_corto VARCHAR(100),
  tipo VARCHAR(30),           -- 'publica' | 'privada' | 'tecnologico'
  subsistema VARCHAR(100),
  estado VARCHAR(100),
  pais VARCHAR(50) DEFAULT 'México',
  matricula_total INT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  activa BOOLEAN DEFAULT TRUE
);

-- Carreras normalizadas (sin duplicados por IES)
CREATE TABLE carreras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_norm TEXT UNIQUE NOT NULL,  -- nombre canónico normalizado
  nombre_variantes TEXT[],           -- otros nombres encontrados
  area_conocimiento VARCHAR(100),    -- OCDE: 'Ciencias Sociales', 'Ingeniería', etc.
  nivel VARCHAR(30),                 -- 'licenciatura' | 'maestria' | 'tsu' | 'doctorado'
  duracion_anios SMALLINT,
  onet_codes_relacionados TEXT[]     -- ocupaciones ONET de egresados típicos
);

-- Relación carrera × IES × ciclo (datos de ANUIES por ciclo)
CREATE TABLE carrera_ies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrera_id UUID REFERENCES carreras(id),
  ies_id UUID REFERENCES ies(id),
  ciclo VARCHAR(10),                 -- '2025/1', '2025/2', etc.
  matricula INT,
  egresados INT,
  costo_anual_mxn INT,
  plan_estudio_skills TEXT[],        -- skills del plan de estudios (SEP/manual)
  ultima_actualizacion_plan DATE,
  UNIQUE(carrera_id, ies_id, ciclo)
);

-- Serie de tiempo de KPIs (todas las dimensiones)
CREATE TABLE kpi_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo VARCHAR(20),  -- 'carrera' | 'ies' | 'sector' | 'estado' | 'nacional'
  entidad_id UUID,
  entidad_nombre TEXT,       -- desnormalizado para queries rápidas
  fecha DATE NOT NULL,
  kpi_nombre VARCHAR(30),    -- 'IVA', 'BES', 'IRF', 'TDM', etc.
  valor DECIMAL(12,4),
  metadatos JSONB            -- inputs del cálculo, pesos, fuentes usadas
);
CREATE INDEX ON kpi_historico(entidad_tipo, entidad_id, kpi_nombre, fecha);

-- Alertas generadas automáticamente
CREATE TABLE alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ies_id UUID REFERENCES ies(id),
  carrera_id UUID REFERENCES carreras(id),
  tipo VARCHAR(50),          -- 'iva_critico' | 'skill_emergente' | 'nueva_carrera' | 'competidor_adaptado'
  severidad VARCHAR(10),     -- 'alta' | 'media' | 'oportunidad'
  titulo TEXT,
  mensaje TEXT,
  accion_sugerida TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  leida BOOLEAN DEFAULT FALSE
);

-- Escenarios predictivos guardados
CREATE TABLE escenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ies_id UUID REFERENCES ies(id),
  tipo VARCHAR(20),          -- 'ramp_up' | 'ramp_down'
  horizonte_anios SMALLINT,  -- 3 o 5
  acciones JSONB,            -- lista de acciones modeladas
  proyecciones JSONB,        -- resultados año a año
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Framework Completo de KPIs — 31 Indicadores · 7 Dimensiones

### D1 — Riesgo de Obsolescencia (4 KPIs)
| KPI | Fórmula | Fuentes |
|-----|---------|---------|
| **IVA** | `0.5·P_aut + 0.3·BES − 0.2·P_aug` ∈ [0,1] | ONET + STPS + ANUIES |
| **P_aut** | `avg(P_aut_ocupación)` para egresados de carrera c | ONET API |
| **BES** | `1 − │Skills_curricula ∩ Skills_JDs│ / │Skills_JDs│` | OCC + SEP + ONET |
| **VAC** | `avg(Fecha_curricula − Fecha_skill_mercado)` en meses | SEP + OCC + ANUIES |

### D2 — Oportunidades Emergentes (4 KPIs)
| KPI | Fórmula | Fuentes |
|-----|---------|---------|
| **IOE** | `(ΔVacantes_IA_sector / Vacantes_total) / CAGR_sector_3años` | OCC + STPS + ILOSTAT |
| **IHE** | `│{skill: Δdemanda > 0.20}│ / Total_skills_sector` | OCC + WEF |
| **IEA** | `P_aug(c) · (1+IOE_sector) · Demanda_egresados / Egresados` | ONET + STPS + ANUIES |
| **VNC** | `│Roles_nuevos_sin_carrera_equivalente│ por trimestre` | OCC + WEF + ONET |

### D3 — Impacto Mercado Laboral (4 KPIs)
| KPI | Fórmula | Fuentes |
|-----|---------|---------|
| **TDM** | `Despidos_IA_sector / Empleo_total_sector` | layoffs.fyi + ILOSTAT |
| **TVC** | `Vacantes_IA_nuevas / Despidos_IA` (>1 = neto positivo) | OCC + layoffs.fyi |
| **BRS** | `Σ(Horas_skill_faltante)` para skills en BES(carrera) | ONET + OCC |
| **ICE** | `Vacantes_con_skills_IA / Total_vacantes_sector` | OCC + WEF |

### D4 — Riesgo Institucional (11 KPIs)
| KPI | Fórmula | Fuentes |
|-----|---------|---------|
| **IRF-IES** | `Σ(IVA_c · Matrícula_c/Total) · (Ing_colegiatura/Ing_total)` | ANUIES + SEP |
| **TRA** | `(Programas_mod_3años/Total) · (1/IVA_promedio)` | SEP + ANUIES |
| **CAD** | `Matrícula_IVA>0.6 / Matrícula_total` | ANUIES |
| **ICV** | `BES_IES / BES_top10_promedio` | SEP + OCC |
| **ISR** | `w1·IRF + w2·CAD + w3·VAC + w4·(1-TRA)` · [0,100] | Compuesto |
| **PAE** | `Matrícula_actual · (1 - IVA·α) · (1+Demo_n) · factor_competencia` | ANUIES + INEGI + ML |
| **ΔEBITDA** | `EBITDA_ramp_up(t) − EBITDA_ramp_down(t)` | PAE + datos financieros |
| **ICP** | `rank(IVA_IES(t))` entre IES del mismo mercado | KPI engine |
| **ROI-R** | `ΔEBITDA_5años / Costo_restructura` | Compuesto |
| **TAI** | `Bajas_traslado / Matrícula_total` | SEP + ANUIES |
| **IRP** | `IVA_c · (1−TRA_c) · (Matrícula_c/Matrícula_max)` | Compuesto |

### D5 — Geografía y Sector (3 KPIs)
| KPI | Fórmula | Fuentes |
|-----|---------|---------|
| **IDR** | `Despidos_IA_estado / Empleo_estado · 1000` | IMSS + layoffs.fyi + ILOSTAT |
| **ICG** | `IES_con_IVA<0.4_radio_50km / IES_totales_región` | ANUIES + INEGI |
| **IES_S** | `(Vacantes_nuevas − Despidos_IA) / Empleo_base` | ILOSTAT + OCC + layoffs.fyi |

### D6 — Individual / Estudiantil (3 KPIs)
| KPI | Fórmula | Fuentes |
|-----|---------|---------|
| **IEI** | `(1−IVA) · P_empleo_estado · (1+IOE_sector) · [0,100]` | STPS + ANUIES + ILOSTAT |
| **CRC** | `IVA_carrera · (1−P_empleo_6meses)` | STPS + ANUIES |
| **ROI-E** | `(Salario_esperado · P_empleo · (1−IVA)) / Costo_carrera` | STPS + SEP + ANUIES |

### D7 — Inteligencia de Noticias (2 KPIs)
| KPI | Fórmula | Fuentes |
|-----|---------|---------|
| **ISN** | `corr(Vol_noticias_sector_t, ΔVacantes_{t+lag})` | GDELT + RSS + OCC |
| **VDM** | `Δ(Artículos_evento) / Δt_horas` · primeras 72h | GDELT + NewsAPI + RSS |

---

## 6. Módulo Predictivo Institucional

### Simulador Ramp Up vs Ramp Down

**Ramp Up** — acciones modeladas:
- Restructurar ≥30% de skills en planes críticos
- Crear 2-3 nuevas carreras en áreas emergentes (IOE > 0.7)
- Modernizar carreras con IVA > 0.60
- Alianzas industria con certificaciones embebidas
- Capacitación docente en IA

**Ramp Down** — comportamiento modelado:
- Sin actualizaciones curriculares
- Sin nuevas carreras
- Egresados pierden competitividad
- Reputación cae por empleabilidad baja
- Estudiantes informados migran a otras IES

**Proyección de resultados (Año 5):**

| Métrica | Ramp Up | Ramp Down | Delta |
|---------|---------|-----------|-------|
| Matrícula | +22% | −19% | **41pp** |
| Ingresos colegiaturas | +28% | −22% | **50pp** |
| EBITDA | +18% | −31% | **49pp** |
| Empleabilidad egresados | 84% | 38% | **46pp** |
| Participación de mercado | +8pp | −11pp | **19pp** |
| Retención estudiantil | +9pp | −14pp | **23pp** |

---

## 7. Herramientas Institucionales (12)

1. Simulador de Reestructura Curricular — upload plan → skills gap → IVA simulado
2. Generador de Nuevas Carreras — VNC + IOE → 3-5 propuestas concretas
3. Benchmarking vs Competidores — IVA/BES/TRA/ICV vs IES región
4. Alertas Tempranas — email/WhatsApp cuando carrera cruza umbral
5. Reporte Ejecutivo Auto-generado — PDF para Consejo Directivo (Claude API)
6. Radar de Alianzas con Industria — empresas que contratan egresados
7. Monitor de Acreditaciones — riesgo RVOE/CACEI/CONACE por carrera
8. Calculadora de Inversión en Reforma — costo × ΔEBITDA → priorización
9. Mapa de Competencia Regional — IES que se adaptan más rápido
10. Dashboard de Empleabilidad por Generación — seguimiento longitudinal cohortes
11. Asistente IA para Rectores (Chat) — contexto KPIs propios → recomendaciones
12. API Institucional Privada — endpoint propio para integrar con ERP/SIA

---

## 8. Dashboards Diseñados

### Dashboard Rector — Panel Institucional
- Nav: Panel / Escenarios / Benchmarking / Alertas / Reportes / Herramientas
- Sidebar: lista de carreras con semáforo IVA
- 5 KPI cards: IVA promedio, IRF-IES, CAD, Empleabilidad, BES
- Tabla carreras: IVA bar, BES, matrícula, IRP, botón de acción
- Panel alertas activas
- Preview escenarios (mini chart + 4 métricas clave)
- Bottom row: skills gap urgentes / nuevas carreras / benchmarking regional

### Dashboard Estudiante — Buscador de Carreras
- Hero con search input + carreras populares
- Result card con: semáforo grande, 4 KPIs (IVA/BES/IOE/IEI)
- 4 tabs: Diagnóstico / Habilidades / Oportunidades / ROI Educativo / Noticias
- ROI cards: salario, empleabilidad, ROI-E actual vs adaptado
- 4 gauges de riesgo con explicación
- Skills faltantes + skills emergentes + skills que ya tiene
- 3 action cards: ruta aprendizaje / sector recomendado / carreras afines
- 3 carreras alternativas con mejor IEA
- Noticias del sector + compartir en RRSS + CTA para rectores

### Dashboard Gobierno — Panel de Política Pública
- Nav: Nacional / Por Estado / Por Sector / Universidades / Skills / Reportes / LatAm
- Sidebar: selección de estado y tipo de entidad
- 6 KPI nacionales: IVA promedio, carreras críticas, empleos desplazados/creados, TVC, IES con IRF alto
- Mapa interactivo México por estado (IDR con circles) + tabla top estados
- Análisis sectorial: IES_S por sector (destrucción vs creación)
- Alertas de política pública priorizadas (alta/media/oportunidad)
- Top 8 skills nacionales vs cobertura educativa
- Señal de noticias (ISN) con sparkline leading indicator

---

## 9. Modelo de Monetización por Fase

| Fase | Producto | Precio | MRR estimado |
|------|---------|--------|-------------|
| 1 (Lean v0) | Reporte IVA personalizado por IES | $500-1,500 USD | $1,500 |
| 1 | Consultoría de adaptación curricular | $3,000-8,000 USD | $3,000 |
| 2 | Membresía institucional IES | $500-2,000 USD/año | $3,500 |
| 2 | Consultoría premium (datos OIA-EE) | +30% sobre tarifa | $2,500 |
| 3 | API licenciable (llamadas) | $200-800 USD/mes | $5,000 |
| 3 | Módulo CRC para SOFOM/bancos | $1,000-3,000 USD/mes | $3,000 |
| 3 | Policy reports para gobiernos | $5,000-20,000 USD | $4,000 |
| 4 | Escala LatAm + data licensing | Variable | $25,000+ |

---

## 10. Variables de Entorno Requeridas

```bash
# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/oia_ee

# Claude API
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL_CLASSIFIER=claude-haiku-4-5   # barato para clasificación masiva
CLAUDE_MODEL_REPORT=claude-sonnet-4-6      # para reportes ejecutivos

# NewsAPI
NEWSAPI_KEY=...

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=...

# App
ENVIRONMENT=development  # development | production
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 11. Cronograma de Implementación (referencia para writing-plans)

### Sprint 1 (Semana 1-2): Fundación de datos
- Setup PostgreSQL + pgvector + Alembic migrations
- news_scraper.py (RSS + GDELT + NewsAPI)
- claude_client.py (clasificación de noticias)
- jobs_pipeline.py (STPS + ONET loader)
- education_loader.py (ANUIES + SEP)

### Sprint 2 (Semana 3-4): KPI Engine
- d1_obsolescencia.py (IVA, P_aut, BES, VAC)
- d2_oportunidades.py (IOE, IHE, IEA, VNC)
- d3_mercado.py (TDM, TVC, BRS, ICE)
- d4_institucional.py (IRF, TRA, CAD, ICV, ISR)
- scheduler.py con APScheduler

### Sprint 3 (Semana 5-6): API
- FastAPI setup + SQLAlchemy
- Routers: carreras, ies, noticias, mercado
- Autenticación básica para endpoints privados

### Sprint 4 (Semana 7-8): Frontend estudiante
- Next.js 14 setup + Tailwind + shadcn/ui
- Buscador de carreras (home page)
- Vista detalle carrera con todos los tabs

### Sprint 5 (Semana 9-10): Dashboard rector
- Panel institucional con tabla de carreras
- Sistema de alertas
- Preview de escenarios

### Sprint 6 (Semana 11-12): Módulos avanzados
- Scenario engine (ramp-up / ramp-down)
- Dashboard gobierno (mapa + sectores)
- Generador PDF con Claude API
- Monitor de noticias con búsqueda semántica

### Sprint 7 (Semana 13-14): Herramientas IES
- Simulador curricular
- Generador de nuevas carreras
- Calculadora ROI de reforma
- Asistente IA (chat)

### Sprint 8 (Semana 15-16): Deploy y Lean v0
- Docker Compose para desarrollo
- Deploy Railway + Vercel
- Datos reales de 50+ IES mexicanas
- Primer reporte OIA-EE México 2026

---

## Estado del Diseño

| Sección | Estado |
|---------|--------|
| Arquitectura global | ✅ Completo |
| Stack tecnológico | ✅ Completo |
| Fuentes de datos (13) | ✅ Completo |
| Esquema de BD (9 tablas) | ✅ Completo |
| Framework KPIs (31) | ✅ Completo |
| Módulo predictivo | ✅ Completo |
| Herramientas IES (12) | ✅ Completo |
| Dashboard rector | ✅ Mockup completo |
| Dashboard estudiante | ✅ Mockup completo |
| Dashboard gobierno | ✅ Mockup completo |
| Estructura repositorio | ✅ Completo |
| Modelo de monetización | ✅ Completo |
| Variables de entorno | ✅ Completo |
| Cronograma (8 sprints) | ✅ Completo |
| **Aprobación usuario** | **⏳ Pendiente** |
