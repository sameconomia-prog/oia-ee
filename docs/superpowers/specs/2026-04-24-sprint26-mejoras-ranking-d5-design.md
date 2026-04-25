# Sprint 26 — Mejoras al Ranking Nacional D5

**Fecha:** 2026-04-24  
**Estado:** Aprobado

## Problema

El ranking D5 carga datos correctamente pero no permite exportar ni ofrece una vista resumida del panorama nacional. Los usuarios (funcionarios, investigadores) necesitan llevar los datos a Excel/informes.

## Alcance

- **Export CSV** del ranking completo: botón "Exportar CSV" visible sólo cuando los datos están cargados; genera `ranking_d5_nacional_YYYY-MM-DD.csv` con columnas `#,Estado,D5 Score,IDR,ICG,IES-S`.
- **Stats card**: tarjeta de resumen encima de la tabla con: N estados cargados, promedio nacional D5, 🥇 mejor estado, 🔴 peor estado, y distribución semáforo (verde / amarillo / rojo).
- Sin cambios al backend ni a tests Python.

## Fuera de alcance

- Ordenamiento interactivo de columnas
- Filtros por región
- Mapa geográfico SVG

## Archivos

| Archivo | Acción |
|---------|--------|
| `frontend/src/components/EstadoRankingNacional.tsx` | Modificar |

## Diseño

### Export CSV
Patrón idéntico al Sprint 23 (TendenciasPanel):
```
Blob → URL.createObjectURL → <a>.click() → URL.revokeObjectURL()
```
Nombre: `ranking_d5_nacional_2026-04-24.csv`  
Sin NFD porque los nombres de estados no tienen acentos problemáticos en CSV (se incluyen tal cual).

### Stats card
Calcular derivados de `datos[]` con `useMemo`:
- `promedio = media de d5.score`
- `mejor = datos[0]` (ya ordenado desc)
- `peor = datos[datos.length-1]`
- `dist = { verde: n>=0.6, amarillo: 0.4<=n<0.6, rojo: n<0.4 }`

Mostrar en una fila de 4 mini-badges/tarjetas encima de la tabla.

## Criterios de éxito

1. `tsc --noEmit` → 0 errores
2. `python -m pytest tests/ -q` → 172 passed (sin regresiones)
3. Botón "Exportar CSV" visible tras cargar datos
4. CSV descargado con 5 columnas y tantas filas como estados cargados
5. Stats card visible con promedio, mejor, peor y distribución
