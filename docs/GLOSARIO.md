# Glosario de nomenclatura — OIA-EE ↔ tesis IEX

Resuelve la colisión de nomenclatura señalada como **alerta crítica #1** del
análisis del panel (docs/estrategia/analisis_panel_research_brief_2026-05.md).
Regla práctica: **"IEX" siempre es exposición (ciencia); "IEI" siempre es
empleabilidad (producto)**. El término "IXIA" propuesto por el panel quedó
obsoleto: el repo de investigación renombró su índice a IEX, que cumple la
misma función desambiguadora.

| Término | Significado | Dominio | Dónde vive |
|---|---|---|---|
| **IEX** | Índice de Exposición a IA (0-10 por ocupación SOC; 7 dimensiones a nivel tarea O*NET) | Ciencia (tesis) | `oia-ee-research`; consumido en `exposicion_iex` |
| **IEX v2** | IEX con compuerta de viabilidad técnica (bits-átomos) | Ciencia | ídem (`iex_v2`) |
| **D1–D7 (del IEX)** | Dimensiones a nivel TAREA: digitalidad, verificabilidad, independencia relacional, estructuración, baja responsabilidad ética, diferencial de coste, rutinariedad cognitiva | Ciencia | `exposicion_iex.dim_d1..dim_d7` |
| **D1–D7 (de OIA-EE)** | KPIs de plataforma: obsolescencia, oportunidades, mercado, institucional, geografía, estudiantil, noticias | Producto | `pipeline/kpi_engine/` — **no confundir con las dimensiones del IEX** |
| **IEI** | Índice de Empleabilidad Individual (sub-indicador del D6 estudiantil) | Producto | `d6_estudiantil.py` |
| **IVA v1** | Valoración técnica de automatización (legacy, base Frey-Osborne/O*NET) | Producto | `d1_obsolescencia.calcular_iva` — se conserva como referencia |
| **IVA v2** | (IEX/10) × (1−FES) × (1−FA) — riesgo ajustado por demanda y adopción | Producto | `d1_iva_v2.py` |
| **FES** | Factor de elasticidad sectorial (E-Alta 0.50 / E-Media 0.25 / E-Baja 0) | Puente | elasticidades aprobadas en `docs/elasticidad_mx.csv` (tesis) |
| **FA** | Fricción de adopción por grupo SOC (regulación, sindicación, frontera física) | Producto | `fa_sectorial` (seed propuesta 2026-06; editable superadmin) |
| **TRC** | Tasa de rutinariedad cognitiva = dimensión D7 del IEX. Se expone como transparencia; **nunca se re-suma** a la fórmula (ya pondera dentro del IEX) | Puente | `exposicion_iex.dim_d7` |
| **IXIA** | Nombre alternativo propuesto por el panel para el índice de exposición — **obsoleto**, usar IEX | — | solo en documentos históricos |
| **VEA** | Velocidad efectiva de automatización (concepto del panel ≈ IVA v2 con FA) | Concepto | implementado dentro del IVA v2 |

**Regla de oro del puente:** la metodología (IEX, elasticidades, dimensiones)
se decide en `oia-ee-research`; OIA-EE consume datasets versionados vía
`pipeline/loaders/iex_loader.py` y nunca recalcula el índice.
