# Diseño — M4 longitudinal (Δsalario ENOE) y M7 v1 (ANUIES/CONAPO)

**Fecha:** 2026-06-12 · **Estado:** DISEÑO (sin implementar — ambos requieren
descargas grandes; regla de la sesión: diseño en vez de implementación)

## M4 longitudinal — Δsalario real por ocupación (ENOE)

**Objetivo.** Pasar del M4 v0 (foto transversal de `contexto_ocupacion_mx`) a
una serie longitudinal: ¿las ocupaciones con IEX alto muestran degradación
salarial relativa? Es la señal de impacto que el panel considera más sólida
que el conteo de vacantes, y alimenta directamente la HP2 de la tesis.

**Datos.** Microdatos trimestrales ENOE (INEGI, tablas SDEM): `ingocup`,
`sinco`, `pos_ocu`, factor de expansión. ~80–150 MB comprimidos por
trimestre; serie mínima útil 2022T1→presente (≥16 trimestres) → **varios GB**.
Por la regla de oro del puente, la descarga y el procesamiento viven en
`oia-ee-research` (metodología); OIA-EE solo consume el dataset exportado.

**Pipeline propuesto.**
1. (repo hermano) Script de descarga + limpieza → dataset versionado
   `outputs/salario_ocupacion_trim.csv`: `(sinco_3d, trimestre,
   mediana_ingreso_real_mxn, n_muestral, factor_sum)`. Deflactar con INPC;
   agregar a SINCO 3 dígitos para controlar ruido muestral.
2. (repo hermano) Reusar el crosswalk SINCO→SOC del mapeo O*NET para unir
   con `exposicion_iex`.
3. (OIA-EE) Extender `iex_refresh_job` con loader idempotente a tabla nueva
   `salario_ocupacion_hist` (migración p37).
4. (OIA-EE) KPI derivado: `delta_salario_12m` por ocupación; agregado por
   carrera vía `carrera_soc_map`; exponer en `/contexto-mx` (campo nuevo
   null-safe) y card existente "Perfil del empleo en México".

**Riesgos.** Cambios de cuestionario ENOE entre años; celdas con n bajo
(suprimir si n<30); la mediana es robusta pero la composición ocupacional
cambia (sesgo de composición — documentar, no corregir en v1).

## M7 v1 — Presión demográfica ANUIES/CONAPO

**Objetivo.** Pasar del M7 v0 (flags de equidad H9) a proyección de cohortes:
¿la matrícula potencial de cada estado crece o se contrae hacia 2030/2035?
Alimenta los escenarios M5 con un componente demográfico real.

**Datos y fases.**
- **F1 — CONAPO (pequeña, implementable en una sesión corta):** proyecciones
  de población por edad simple y entidad 2020–2070 (un CSV ~50 MB). Tabla
  `demografia_estado(entidad, anio, poblacion_18_22)`. KPI: índice de presión
  demográfica = cohorte 18-22 proyectada (2030/2035) vs actual, por estado.
  Se muestra en `/escenarios` (rango demográfico) y dashboard rector.
- **F2 — ANUIES (pesada, formatos heterogéneos):** anuarios estadísticos por
  ciclo (Excel, estructura cambia por año) → `matricula_hist(programa, ies,
  entidad, ciclo, matricula)`. KPI: razón matrícula observada / cohorte
  proyectada por carrera-estado. Requiere limpieza manual considerable;
  evaluar scraping del SIE de ANUIES vs captura de los 17 benchmarks
  primero (cobertura dirigida, no exhaustiva).

**Orden recomendado.** F1 CONAPO primero (esfuerzo bajo, mejora visible en
escenarios); M4 ENOE después (alto valor tesis+producto); F2 ANUIES al final
o acotada a las 17 carreras benchmark.
