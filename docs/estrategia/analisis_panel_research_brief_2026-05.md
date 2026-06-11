# Análisis del Panel de Expertos: Integración Research Brief ↔ OIA-EE

**Fecha:** 2026-05-23
**Coordinador:** Panel de 5 expertos (Economista, IA, Política Pública, Sociólogo, Data Scientist)
**Objeto:** Comparar marco IEI/Jevons/Hinton con KPI Engine D1–D7 de OIA-EE y producir plan de enriquecimiento.

---

## Parte 1 — Análisis comparativo estructurado

### 1.1 Cobertura de elementos del Research Brief en OIA-EE

| # | Elemento del brief | Estado en OIA-EE | Detalle |
|---|---|---|---|
| 1 | Clasificación A/B/C por IEI (sustitución / complementariedad / impacto bajo) | **Parcial** | OIA-EE tiene taxonomía `automated/augmented/resilient` a nivel skill, no a nivel profesión. No hay umbrales numéricos públicos (70/30) ni reporte de tipo por carrera. |
| 2 | IEI como promedio de 7 dimensiones a nivel TAREA, ponderado por importancia O*NET | **Ausente** | El IVA actual de OIA-EE opera a nivel skill/ocupación, no descompone tareas, y los pesos son ad-hoc (0.50/0.30/0.20) no derivados de O*NET. |
| 3 | D1 Digitalidad tarea | Parcial | Se infiere del cruce skill→carrera, sin medición explícita. |
| 4 | D2 Verificabilidad (criterio objetivo medible) | **Ausente** | No se mide. Dimensión crítica para LLM-fit. |
| 5 | D3 Independencia relacional | Parcial | Capturado tangencialmente en skills "interpersonal" pero sin score 0–10. |
| 6 | D4 Estructuración del entorno | **Ausente** | No hay clasificación físico/digital estructurado por tarea. |
| 7 | D5 Responsabilidad ética | **Ausente** | No existe variable ética; tampoco en literatura latinoamericana. Brecha grave para profesiones salud/legal/educación. |
| 8 | D6 Diferencial de coste IA/humano | **Ausente** | OIA-EE no modela coste hora IA vs salario MX. Variable accionable y faltante. |
| 9 | D7 Rutinariedad cognitiva (Hinton) | **Ausente** | El IVA actual hereda Frey-Osborne 2013 que ignora cognitivo-rutinario. **Brecha grande**. |
| 10 | Paradoja de Jevons / elasticidad sectorial E-Alta/Media/Baja | **Ausente** | OIA-EE no tiene módulo de demanda latente. Resultado: subestima salud/educación, sobreestima riesgo en contabilidad. |
| 11 | Fricción de Adopción (FA) por sector | **Ausente** | OIA-EE asume velocidad de adopción uniforme. No incorpora regulación, sindicación, cultura de consumo. |
| 12 | Velocidad efectiva = IEI × (1 − FA) | **Ausente** | Consecuencia directa de los dos anteriores. |
| 13 | Análisis distributivo (Δsalario, calidad, autonomía, estabilidad, barreras) | **Ausente** | OIA-EE mide stock de empleo (TDM, BRS) pero no calidad ni distribución. |
| 14 | Creación ocupacional emergente — Enfoque A (extrapolación histórica) | **Ausente** | No modelado. |
| 15 | Enfoque B (taxonomía estructural 8 categorías) | **Parcial** | IOE (Índice Oportunidades Emergentes) existe pero sin esta taxonomía. |
| 16 | Enfoque C (cuellos de botella IA → empleos) | **Ausente** | No modelado. |
| 17 | H4 Jevons | Ausente | — |
| 18 | H6 Yampolskiy (meta-invención) | Ausente | — |
| 19 | H7 Elasticidad > automatizabilidad técnica | Ausente — **contradice supuesto implícito de OIA-EE** | OIA-EE actualmente asume que IVA alto ⇒ riesgo empleo alto. Hinton/H7 dice que esto es falso sin condicionar por elasticidad. |
| 20 | H8 Trabajo intelectual rutinario alto riesgo | Ausente — **contradice clasificación skill actual** | OIA-EE clasifica muchas tareas cognitivas como `augmented` que H8 marcaría como `automated`. |
| 21 | H9 Polarización beneficios concentrados | Ausente | — |
| 22 | Supuestos S1–S4 con horizonte explícito (2026–2041) | Ausente | OIA-EE no declara horizonte de validez ni supuestos. |
| 23 | Escenarios (Continuista / Polarización / Disruptivo / Yampolskiy) | Ausente | OIA-EE no genera escenarios; produce un único score puntual. |

### 1.2 Lo que tiene OIA-EE y NO está en el brief

| Elemento OIA-EE | Valor diferencial |
|---|---|
| Pipeline OCC México (vacantes reales) | Granularidad geográfica y sectorial mexicana ausente del brief. |
| GDELT + ISN/VDM (D7 noticias) | Señal temporal de aceleración mediática que el brief no modela. |
| Multi-fuente con convergencia ≥75% (OECD/WEF/McKinsey) | Validación cruzada que el brief asume pero no operacionaliza. |
| Nivel IES (D4 institucional: TRA/CAD/IRF) | El brief es macro; OIA-EE actúa sobre el accionable real (rector). |
| Biblioteca MDX 80+ artículos | Capa de explicación faltante en el brief. |
| Modelo SOFOM (CRC = IVA × (1−P_empleo_6m)) | Aplicación financiera concreta. |
| Skill taxonomy 200 ítems clasificados | Granularidad operativa. |
| D6 Estudiantil (IEI/CRC/ROI_E) — colisión nominal | OIA-EE usa "IEI" como Índice de Empleabilidad Individual; el brief usa "IEI" como Índice de Exposición a IA. **Conflicto de nomenclatura a resolver**. |

---

## Parte 2 — Voz de cada experto del panel

### 2.1 Economista PhD (economía laboral)

**Hallazgos críticos**
1. La fórmula `IVA×0.50 + BES×0.30 + VAC×0.20` tiene pesos no justificados; no hay paper que valide esa ponderación para México. Frey-Osborne 2013 está obsoleto post-LLM (Eloundou 2023 reescribió el riesgo cognitivo).
2. **Ausencia de elasticidad sectorial es el error metodológico más grave**: OIA-EE puede estar marcando "Crítico" a enfermería o psicología cuando son E-Alta y empleo crecerá. Esto es un falso positivo institucionalmente costoso (un rector puede cerrar una carrera buena).
3. No hay análisis distributivo: dos profesiones con IVA=0.6 pueden tener trayectorias salariales opuestas (una se proletariza, la otra se polariza al alza). El KPI no lo distingue.
4. Comparabilidad MX↔USA: O*NET task importance no existe para México. Usar O*NET directamente importa sesgos de estructura ocupacional estadounidense (más servicios, menos informalidad).
5. D3 mezcla TDM y BRS sin tratar la informalidad mexicana (~55% PEA). BRS de OCC subestima sectores informales.

**Recomendaciones**
- Introducir **factor de elasticidad sectorial (FES)** como multiplicador del IVA. Reportar `IVA_ajustado = IVA × (1 − FES_norm)` donde FES_norm refleja demanda reprimida.
- Reemplazar pesos ad-hoc por **calibración bayesiana** contra outcomes observados (empleo OCC 12 meses post-medición).
- Añadir vector distributivo de 5 componentes (Δ salario, calidad, autonomía, estabilidad, barreras) por carrera.

### 2.2 Experto en IA (ML/GenAI)

**Hallazgos críticos**
1. La taxonomía `automated/augmented/resilient` está congelada en frontera 2023; agentes autónomos (2025–2026) mueven masivamente skills de `augmented` a `automated`. Falta versionar la clasificación con fecha de corte y modelo de referencia.
2. **D7 rutinariedad cognitiva (Hinton) es la dimensión más importante post-LLM y OIA-EE no la tiene.** Tareas cognitivas digitales rutinarias (revisión de contratos básicos, conciliación contable, redacción de reportes estándar) son drop-in replaceable hoy.
3. D6 del brief (coste IA/humano) ya es medible con benchmarks públicos (token cost × tokens/tarea vs salario hora). OIA-EE puede operacionalizarlo trivialmente.
4. La capa "automated" actual probablemente subestima tareas multimodales (visión + texto) que GPT-4o/Claude resuelven.
5. No hay tracking de **capability frontier**: el IVA es estático mientras los modelos avanzan trimestralmente.

**Recomendaciones**
- Crear endpoint `/api/v1/capability-frontier` que versiona la taxonomía skill con `{modelo, fecha, capacidad}` y dispara re-scoring trimestral.
- Implementar **D7-TRC (Tasa Rutinariedad Cognitiva)** como nueva sub-dimensión del IVA: `IVA_v2 = IVA_v1 × 0.85 + TRC × 0.15`.
- Añadir `coste_ia_tarea_usd` y `coste_humano_tarea_mxn` como columnas en la tabla de tareas; calcular ratio.

### 2.3 Experto en política pública y educación superior

**Hallazgos críticos**
1. Un rector necesita responder: ¿cierro la carrera X? ¿la rediseño? ¿en cuánto tiempo? OIA-EE produce un score pero no un **plan de acción temporal**. Falta horizonte (2y/5y/10y) que el brief sí propone (2026–2041).
2. D4 institucional (TRA/CAD/IRF) mide adaptación de la IES pero no la *velocidad requerida* dada la elasticidad del sector destino de sus egresados.
3. La biblioteca MDX está desconectada del KPI: un rector ve "D1=0.78 Crítico" sin ruta directa a las 3 acciones recomendadas.
4. Ausencia de **escenarios**: política pública educativa requiere planificación bajo incertidumbre, no un punto estimado.
5. Falta capa de **costo de transición curricular**: rediseñar un programa cuesta 18-36 meses; OIA-EE no integra ese lead time.

**Recomendaciones**
- Crear módulo **D8 Recomendación Accionable**: por carrera, generar 3 acciones priorizadas (mantener / rediseñar / fusionar / cerrar) con horizonte y coste estimado.
- Introducir **vista escenarios**: dashboard que muestra trayectoria de la carrera bajo Continuista/Polarización/Disruptivo (probabilidades del brief).
- Vincular cada KPI alto a artículos MDX específicos (link contextual, no biblioteca aparte).

### 2.4 Sociólogo / investigador de desigualdad

**Hallazgos críticos**
1. OIA-EE mide *si* habrá empleo pero no *para quién*. H9 (polarización Hinton) es el hallazgo más sociológicamente relevante y está completamente ausente.
2. La métrica TDM trata 100 empleos en plataforma como equivalentes a 100 empleos formales. Calidad del empleo invisible.
3. Variables faltantes: género (carreras feminizadas tienen patrones de automatización distintos), informalidad, brecha urbano-rural, primera generación universitaria.
4. La dignidad/sentido del trabajo (Hinton frame) — un cirujano "augmented" por IA puede sentir pérdida de autonomía aunque conserve salario. No medible con D1–D7 actuales.
5. **Riesgo ético del propio OIA-EE**: si un rector cierra una carrera por score alto y la carrera era principal vía de movilidad para sectores populares, OIA-EE puede ampliar la brecha que pretende informar.

**Recomendaciones**
- Añadir **D9 Equidad**: índice compuesto por (% mujeres, % primera generación, % estados marginalizados) cruzado con IVA. Reportar "carreras de alta movilidad social bajo riesgo IA".
- Capa de **calidad del empleo** (formalidad, prestaciones, autonomía declarada en encuestas) como modulador del BRS.
- Disclaimer ético + límites del modelo visible en cada dashboard de rector.

### 2.5 Data Scientist / Ingeniería de datos

**Hallazgos críticos**
1. Operacionalizar IEI a nivel tarea en México requiere **mapeo O*NET → SINCO** (sistema mexicano). Existe trabajo previo del INEGI pero incompleto. Es la fricción técnica #1.
2. OCC scraping cubre ~60-70% de vacantes formales urbanas; sectores rurales/informales invisibles. BRS sesgado.
3. FA (fricción adopción) por sector es operacionalizable con: índice de regulación (CONAMER), tasa sindicación (ENOE), HHI sectorial (concentración) — todos públicos.
4. GDELT D7 es ruidoso; ISN/VDM probablemente sobre-reaccionan a hype cycles. Necesita suavizado exponencial y comparación contra baseline sectorial.
5. **Costo IA/humano** trivial de calcular: API pricing público (Anthropic/OpenAI) + salarios CONASAMI/IMSS. Es la mejora con mejor ratio impacto/esfuerzo.

**Recomendaciones**
- Construir tabla puente `task_id × dim_D1..D7_brief × score_0_10` poblada por LLM-as-judge sobre descripciones O*NET traducidas y ajustadas a SINCO; validar con muestra anotada manualmente.
- Endpoint `/api/v1/jevons/elasticity` poblado por reglas + datos OCDE/INEGI: salud, educación → E-Alta; contabilidad regulatoria, call center → E-Baja.
- Versionar IVA: `iva_v1` (legacy) + `iva_v2` (ajustado por TRC + FES). Mantener ambos durante 6 meses.

---

## Parte 3 — Síntesis de enriquecimiento estratégico

**Top 7 mejoras ordenadas por (valor teórico × factibilidad × datos disponibles):**

| # | Mejora | Valor | Factibilidad | Datos MX | Score |
|---|---|---|---|---|---|
| 1 | **TRC (Tasa Rutinariedad Cognitiva) como sub-dimensión del IVA** | Alto (H8 Hinton) | Alta (LLM-as-judge sobre tareas) | Sí (O*NET→SINCO) | ★★★★★ |
| 2 | **FES (Factor Elasticidad Sectorial) + IVA_ajustado** | Muy Alto (corrige falsos positivos críticos) | Media (mapeo sectorial) | Sí (OCDE/INEGI/CONAMER) | ★★★★★ |
| 3 | **Coste IA/humano por tarea (D6 brief)** | Alto (accionable, comercial) | Muy Alta (datos públicos) | Sí (CONASAMI + APIs) | ★★★★★ |
| 4 | **Vector distributivo (Δsalario/calidad/autonomía/estabilidad/barreras)** | Alto (sociológico + decisor) | Media (requiere ENOE) | Sí (ENOE INEGI) | ★★★★ |
| 5 | **Módulo escenarios (Continuista/Polarización/Disruptivo/Yampolskiy)** | Alto (política pública) | Media (motor probabilístico) | Sí (existentes) | ★★★★ |
| 6 | **D8 Recomendación Accionable + horizonte temporal** | Alto (cierra loop al rector) | Media-Alta (LLM + reglas) | Sí | ★★★★ |
| 7 | **D9 Equidad (género, 1ª generación, geografía marginalizada)** | Alto (sociológico, ético) | Media (ENOE + ANUIES) | Sí | ★★★½ |

Mejoras descartadas / postergadas:
- Yampolskiy meta-invención: alto valor teórico, baja factibilidad de modelado cuantitativo a 2026.
- Enfoque C (cuellos de botella IA): requiere capability frontier maduro; postergar a 2027.

---

## Parte 4 — Plan de implementación por módulos

### Módulo M1 — IVA v2 con TRC
- **Descripción técnica**: Añadir columna `routine_cognitive_score` (0–1) a tabla `tasks`. Poblada vía LLM-as-judge con prompt calibrado contra muestra anotada manual (n=500). Recalcular IVA: `iva_v2 = 0.85 × iva_v1 + 0.15 × TRC_carrera`.
- **Endpoint nuevo**: `GET /api/v1/iva/v2/{carrera_id}` retorna ambas versiones más delta.
- **Datos**: O*NET tasks (existente) + mapeo SINCO (construir, 4-6 semanas). Prompts via Anthropic API.
- **Roadmap**: **additive**, no rompe D1 existente; versión dual durante 6 meses.

### Módulo M2 — FES (Factor Elasticidad Sectorial) e IVA_ajustado
- **Descripción técnica**: Tabla `sector_elasticity` con columnas `(sector_sinco, fes_score [0–1], categoria [E-Alta/Media/Baja], fuente, fecha)`. Cálculo: `velocidad_efectiva = iva_v2 × (1 − FA) × (1 − FES_norm)`.
- **Endpoint nuevo**: `GET /api/v1/jevons/sector/{sector_id}` y `GET /api/v1/carrera/{id}/iva-ajustado`.
- **Datos**: OCDE elasticidad demanda servicios + INEGI ENOE histórico (proyección demanda) + CONAMER regulación. Reglas manuales iniciales con override por evidencia.
- **Roadmap**: **additive**. Crítico antes de cualquier export comercial.

### Módulo M3 — Coste IA/humano (D6 brief)
- **Descripción técnica**: Tabla `task_cost_comparison(task_id, tokens_estimados, modelo_ref, costo_ia_usd, salario_hora_mxn, ratio)`. Cron mensual que actualiza precios API.
- **Endpoint nuevo**: `GET /api/v1/task/{id}/cost-ratio`.
- **Datos**: Anthropic/OpenAI pricing públicos; CONASAMI + IMSS para salarios; tokens estimados via prompt template + medición.
- **Roadmap**: **additive**. Activa narrativa "drop-in employee" — alto valor comercial.

### Módulo M4 — Vector distributivo
- **Descripción técnica**: Tabla `carrera_distributive_vector(carrera_id, d_salario, d_calidad, d_autonomia, d_estabilidad, d_barreras, fecha)` poblada desde ENOE longitudinal.
- **Endpoint nuevo**: `GET /api/v1/carrera/{id}/distributivo`.
- **Datos**: ENOE INEGI trimestral (existe API). Cálculo: deltas vs baseline 2019.
- **Roadmap**: **additive**, alimenta narrativa H9 polarización.

### Módulo M5 — Escenarios
- **Descripción técnica**: Motor probabilístico simple (Markov 4-estado o ensamble de reglas) que proyecta carrera bajo cada escenario a 2030/2035/2041. Frontend: gráfico fan-chart.
- **Endpoint nuevo**: `GET /api/v1/carrera/{id}/escenarios?horizonte=2030`.
- **Datos**: Inputs ya existentes (IVA, FES, TRC) + probabilidades del brief.
- **Roadmap**: **additive**, fuerte sinergia con export PowerPoint del roadmap mediano plazo.

### Módulo M6 — D8 Recomendación Accionable
- **Descripción técnica**: Motor de reglas + LLM que combina IVA_v2, FES, vector distributivo y D4 institucional para emitir 3 acciones priorizadas con horizonte (mantener/rediseñar/fusionar/cerrar).
- **Endpoint nuevo**: `GET /api/v1/carrera/{id}/recomendacion?ies={ies_id}`.
- **Datos**: KPIs existentes + plantillas curriculares ANUIES.
- **Roadmap**: **modifica** UX dashboard rector — coordinar con frontend.

### Módulo M7 — D9 Equidad
- **Descripción técnica**: Cruce de matrícula por (género, 1ª generación, entidad federativa marginalización CONAPO) con IVA_ajustado. Alerta "carrera vía de movilidad bajo riesgo IA".
- **Endpoint nuevo**: `GET /api/v1/equidad/movilidad-en-riesgo`.
- **Datos**: ANUIES 911 (matrícula) + CONAPO marginalización + ENOE.
- **Roadmap**: **additive**. Reduce riesgo ético del producto.

---

## Parte 5 — Alertas críticas (a resolver antes/durante integración)

1. **Colisión de nomenclatura "IEI"**: OIA-EE usa "IEI" = Índice Empleabilidad Individual (D6 estudiantil); brief usa "IEI" = Índice Exposición a IA. **Acción**: renombrar el del brief como **IXIA** (Índice de eXposición a IA) en el dominio interno; documentar en glosario antes de cualquier integración. Sin esto, todo el pipeline se confunde.

2. **Falso positivo metodológico activo en producción**: el IVA actual probablemente está marcando carreras de salud/educación/terapia como riesgo alto cuando son E-Alta. Es decir, **OIA-EE puede estar dando hoy recomendaciones perjudiciales a rectores**. Urgente: añadir disclaimer en dashboard y priorizar M2 (FES) como hotfix metodológico, no como feature.

3. **Frey-Osborne 2013 como base del IVA está obsoleto**: ese paper no cubre LLM, no cubre cognitivo-rutinario. Si la base del IVA sigue siendo Frey-Osborne sin la corrección Eloundou 2023, la métrica está midiendo riesgo de automatización pre-IA-generativa.

4. **D7 noticias (ISN/VDM) puede estar dominado por hype cycle GDELT**: necesario validar contra ground truth (vacantes reales OCC 12 meses después). Riesgo de circular: noticias alarmistas suben D7, OIA-EE reporta alarma, alimenta más noticias.

5. **Ausencia de horizonte de validez explícito**: OIA-EE produce un número sin decir "válido bajo supuestos S1–S4 hasta 2030". Esto es metodológicamente débil y legalmente expuesto si se comercializa.

6. **D5 Geografía declarada "pendiente/conceptual"**: bloquea cualquier afirmación regional. Si se vende API comercial sin D5, es vulnerable.

7. **Skill taxonomy 200 ítems no versionada contra capability frontier**: cada release de modelo (Claude 4.7, GPT-5) debería disparar re-evaluación. Sin esto la taxonomía decae silenciosamente.

8. **Riesgo ético-distributivo**: sin D9 Equidad, OIA-EE puede ser instrumento de cierre de carreras que son vía de movilidad social. **El propio producto necesita una evaluación de impacto** antes de comercialización SOFOM o API multi-tenant.

---

## Anexo — Mapeo de nomenclatura sugerido

| Concepto del brief | Nombre actual OIA-EE | Nombre propuesto unificado |
|---|---|---|
| IEI (Índice Exposición IA) | — | **IXIA** |
| Dimensiones D1–D7 tarea | (sin equivalente) | **dim_T1..T7** (tarea) |
| KPIs plataforma D1–D7 | D1–D7 | mantener **D1–D7** |
| IEI estudiantil (D6 OIA) | IEI | renombrar **IEI_emp** o **IndEmplInd** |
| Velocidad efectiva automatización | — | **VEA** |
| Factor Elasticidad Sectorial | — | **FES** |
| Fricción Adopción | — | **FA** |
| Tasa Rutinariedad Cognitiva | — | **TRC** |
