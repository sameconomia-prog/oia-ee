# OIA-EE — Sprint 12 Completado

**Fecha:** 2026-04-23
**Estado:** ✅ Completado
**Tag git:** sprint12-kpi-d3-d6

## Qué se construyó

| Módulo | Archivos | Tests |
|--------|----------|-------|
| KPI Engine D3 | `pipeline/kpi_engine/d3_mercado.py` | 6 ✅ |
| KPI Engine D6 | `pipeline/kpi_engine/d6_estudiantil.py` | 6 ✅ |
| KPI Runner actualizado | `pipeline/kpi_engine/kpi_runner.py` | +2 ✅ |

**Total acumulado: 95 tests pasando**

## KPI Engine D3 (Impacto Mercado Laboral)

- `TDM` = noticias_despido / vacantes_sector — [0,1]
- `TVC` = vacantes_IA / despidos_IA — ratio (>1 = neto positivo)
- `BRS` = skills_plan_no_demandadas / total_plan — [0,1]
- `ICE` = vacantes_IA / total_vacantes_sector — [0,1]
- Score = tdm×0.4 + brs×0.4 + max(0, 1−tvc)×0.2

```python
from pipeline.kpi_engine.d3_mercado import calcular_d3, D3Result

result: D3Result = calcular_d3(carrera_ies, session, sector="Tecnología")
# result.tdm, result.tvc, result.brs, result.ice, result.score
```

## KPI Engine D6 (Individual/Estudiantil)

- `IEI` = (1−IVA) × p_empleo × (1+IOE) clamped [0,1]
- `CRC` = IVA × (1−p_empleo) clamped [0,1]
- `ROI-E` = (sal_esperado × p_empleo × (1−IVA)) / 50,000 clamped [0,1]
- Score = iei×0.4 + (1−crc)×0.35 + roi_e×0.25
- `calcular_d6` recibe `D1Result`+`D2Result` como parámetros

```python
from pipeline.kpi_engine.d6_estudiantil import calcular_d6, D6Result

result: D6Result = calcular_d6(carrera, carrera_ies, d1, d2, session, sector="Tecnología")
# result.iei, result.crc, result.roi_e, result.score
```

## KpiResult actualizado (4 dimensiones)

```python
@dataclass
class KpiResult:
    carrera_id: str
    d1_obsolescencia: D1Result
    d2_oportunidades: D2Result
    d3_mercado: D3Result      # nuevo
    d6_estudiantil: D6Result  # nuevo
```

## Nota técnica: orden filter/limit en SQLAlchemy

En SQLAlchemy Legacy Query API, `.filter()` debe ir ANTES de `.limit()`.
Patrón correcto:
```python
q = session.query(Vacante)
if sector:
    q = q.filter(Vacante.sector == sector)
vacantes = q.limit(MAX).all()  # limit va al final
```

## Para arrancar Sprint 13

```bash
cd /Users/arturoaguilar/Documents/OIA-EE
source pipeline/.venv/bin/activate
python -m pytest tests/ -q       # 95 tests
```

## Deuda conocida (Sprint 13)

| Ítem | Estado |
|------|--------|
| D4 — Riesgo Institucional (IRF-IES, TRA, CAD, ICV, ISR) | Pendiente |
| D5 — Geografía y Sector (runner estado-nivel) | Pendiente |
| D7 — Inteligencia de Noticias (ISN correlación time-series) | Pendiente |
| Endpoint API `/kpis` — exponer d3+d6 en respuesta | Pendiente |

Candidatos Sprint 13: D4 (datos financieros IES básicos) + endpoint API actualizado.
