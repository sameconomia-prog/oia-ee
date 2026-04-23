# OIA-EE — Sprint 13 Completado

**Fecha:** 2026-04-23
**Estado:** ✅ Completado
**Tag git:** sprint13-d4-api

## Qué se construyó

| Módulo | Archivos | Tests |
|--------|----------|-------|
| KPI Engine D4 | `pipeline/kpi_engine/d4_institucional.py` | 6 ✅ |
| kpi_runner IES | `pipeline/kpi_engine/kpi_runner.py` | +2 ✅ |
| API schemas+router | `api/schemas.py`, `api/routers/kpis.py` | +6 ✅ |

**Total acumulado: 106 tests pasando**

## KPI Engine D4 (Riesgo Institucional)

Opera a nivel IES — agrega datos de todas sus CarreraIES.

- `TRA` = Σegresados / max(1, Σmatricula) [0,1] — retención
- `IRF` = avg(costo_anual_mxn) / 80,000 MXN [0,1] — riesgo financiero
- `CAD` = carreras_con_plan_skills / total_carreras [0,1] — actualización curricular
- Score = TRA×0.40 + CAD×0.35 + (1−IRF)×0.25

```python
from pipeline.kpi_engine.d4_institucional import calcular_d4, D4Result
from pipeline.kpi_engine.kpi_runner import run_kpis_ies, IesKpiResult

result: IesKpiResult = run_kpis_ies(ies_id, session)
# result.d4_institucional.tra, .irf, .cad, .score
```

## API actualizada

- `GET /kpis/carrera/{id}` → ahora retorna D1+D2+D3+D6
- `GET /kpis/ies/{id}` → nuevo, retorna D4

## Deuda conocida (Sprint 14)

| Ítem | Estado |
|------|--------|
| D5 — Geografía y Sector | Pendiente |
| D7 — Inteligencia de Noticias (ISN) | Pendiente |
| ICV, ISR en D4 (requieren datos acreditación) | Pendiente |
| Dashboard frontend — exponer D3+D4+D6 | Pendiente |
| Poblar datos reales en producción | Pendiente |

## Para arrancar Sprint 14

```bash
cd /Users/arturoaguilar/Documents/OIA-EE
source pipeline/.venv/bin/activate
python -m pytest tests/ -q
```
