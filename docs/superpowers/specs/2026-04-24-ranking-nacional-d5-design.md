# Sprint 25 — Ranking Nacional D5 por Estado

**Fecha:** 2026-04-24  
**Estado:** Aprobado

## Problema

`EstadoKpiSection` muestra D5 de un estado a la vez (selector + botón). No existe vista de todos los estados simultáneamente para comparar el panorama nacional de D5 Geografía.

## Alcance

- Nuevo componente `EstadoRankingNacional.tsx`: botón que dispara fetch paralelo (`Promise.allSettled`) de los 32 estados, muestra tabla rankeada por score D5 (desc), con color coding verde/amarillo/rojo
- Nuevo tab "D5 Ranking Nacional" en `kpis/page.tsx`
- Sin cambios al backend — usa endpoint existente `GET /kpis/estado/{estado}`

## Fuera de alcance

- SVG/mapa geográfico real con paths por estado
- Ordenamiento interactivo de columnas
- Filtros por región

## Archivos

| Archivo | Acción |
|---------|--------|
| `frontend/src/components/EstadoRankingNacional.tsx` | Crear |
| `frontend/src/app/kpis/page.tsx` | Agregar tab |

## Diseño del componente

Botón "Cargar ranking nacional" → muestra progreso `Cargando... N/32` → tabla con columnas: # | Estado | D5 Score | IDR ↓ | ICG ↑ | IES-S ↑

Notas de la tabla:
- IDR: menor es mejor (↓), ICG e IES-S: mayor es mejor (↑)
- Score coloreado: verde ≥0.6, amarillo ≥0.4, rojo <0.4
- Si falla algún estado → se omite silenciosamente

## Criterios de éxito

1. `tsc --noEmit` → 0 errores
2. `python -m pytest tests/ -q` → 172 passed (sin regresiones)
3. Tab "D5 Ranking Nacional" visible en `/kpis`
4. Botón carga 32 estados con progreso visible
5. Tabla ordenada desc por score con color coding
