# Diseño — Validación del D7 noticias (ISN/VDM) contra ground truth OCC

**Fecha:** 2026-06-12 · **Origen:** alerta #4 del análisis del panel
(`analisis_panel_research_brief_2026-05.md`) · **Estado:** v1 implementada
(captura de pares); evaluación ejecutable cuando los datos maduren

## Problema

El D7 (ISN = correlación noticias→Δvacantes a 1 semana; VDM = velocidad
mediática 72 h) puede estar dominado por el hype cycle de GDELT: *"noticias
alarmistas suben D7, OIA-EE reporta alarma, alimenta más noticias"* (riesgo
de circularidad). El panel pide validarlo contra **ground truth = vacantes
reales OCC 12 meses después**. Hoy nada persiste la foto necesaria para esa
comparación: cuando queramos evaluarla, la señal de "hace 12 meses" ya no
será reconstruible (las tablas evolucionan y el ISN se recalcula al vuelo).

## Diseño

### 1. Captura de pares (lo que se implementa hoy)

Tabla `d7_validacion_snapshot` (migración `p36d7val001`), una fila por
`(fecha, sector)` con unique constraint — el job es idempotente:

| Columna | Contenido |
|---|---|
| `fecha` | fecha del snapshot (semanal) |
| `sector` | sector con actividad en los últimos 30 días |
| `noticias_7d`, `noticias_30d` | volumen de noticias del sector (la "señal") |
| `vacantes_30d` | vacantes OCC del sector en los últimos 30 días (baseline) |
| `isn_global`, `vdm_global`, `d7_score_global` | valores del D7 al momento del snapshot |

Job `pipeline/jobs/d7_validacion_job.py::run_d7_validacion_snapshot`,
agendado semanal (lunes 6:00, tras el kpi_snapshot de las 5:00) con el mismo
wrapper `notify_job_result` del resto de los jobs.

### 2. Evaluación (implementada, ejecutable a partir de ~jun-2027)

`evaluar_validacion_d7(session, hoy=None)`: para cada snapshot **maduro**
(`fecha + 365 días ≤ hoy`), el ground truth es el conteo de vacantes OCC del
sector en la ventana `[fecha+335, fecha+365]` y el resultado es
`delta = vacantes_realizadas − vacantes_30d`. Por sector con ≥ 3 pares
maduros se calcula Pearson(`noticias_30d`, `delta`); se reporta
`{pares_totales, sectores: [{sector, n_pares, correlacion}], correlacion_promedio}`.

**Criterio de lectura** (para la decisión metodológica futura):
- correlación promedio ≥ 0.3 → la señal mediática anticipa demanda; ISN se
  mantiene con su peso actual (0.60 del D7).
- entre −0.1 y 0.3 → señal débil: bajar peso de ISN y aplicar el suavizado
  exponencial + baseline sectorial que sugirió el panel.
- < −0.1 → señal contraria (hype puro): excluir ISN del score D7 hasta
  rediseñarlo.

### 3. Limitaciones aceptadas

- OCC cubre ~60-70 % de vacantes formales urbanas (sesgo BRS conocido del
  panel); el ground truth hereda ese sesgo. Se documenta, no se corrige en v1.
- La ventana de 30 días alrededor del mes 12 suaviza estacionalidad puntual
  pero no la elimina; con ≥ 12 meses de snapshots semanales habrá pares
  suficientes para promediar el efecto.
- Si el scraper OCC cambia de cobertura sectorial durante el año, los deltas
  se contaminan — `vacantes_30d` baseline por snapshot mitiga el nivel, no la
  tendencia de cobertura.
