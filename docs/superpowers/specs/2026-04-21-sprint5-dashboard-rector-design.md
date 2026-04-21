# Sprint 5 — Dashboard Rector: Diseño

**Fecha:** 2026-04-21  
**Estado:** Aprobado  
**Proyecto:** OIA-EE — Observatorio de IA en Educación y Empleo  

---

## 1. Objetivo

Construir el dashboard institucional para rectores/directivos de IES. El rector entra a `/rector?ies_id=1`, ve el estado KPI de todas las carreras de su institución con semáforo BSC y un panel lateral de alertas activas (carreras en estado crítico).

---

## 2. Alcance del Sprint

**Incluido:**
- Nueva ruta `/rector?ies_id=N` en el frontend
- Nuevo endpoint `GET /rector?ies_id=N` en FastAPI
- Panel lateral de alertas activas (calculadas on-the-fly, sin job background)
- Tabla de carreras de la IES con KPIs completos (D1 + D2 + sub-indicadores)
- Enlace "Rector" en el Sidebar

**Excluido (→ Sprint 6):**
- Simulador de escenarios ramp-up / ramp-down
- Autenticación real (→ Sprint 8)
- Alertas persistentes con historial (usan tabla `alertas` de DB → Sprint 6)
- Mapa de calor geográfico

---

## 3. Identificación de IES

La IES se identifica mediante parámetro URL: `/rector?ies_id=1`.

- Sin autenticación en Sprint 5 — cualquiera con la URL puede ver los datos
- Si no se pasa `ies_id`, la página muestra mensaje "Selecciona una IES para continuar" sin crashear
- IDs numéricos alineados con la tabla `ies` en PostgreSQL
- En Sprint 8 se añadirá login real delante de estas rutas sin cambiar la lógica del dashboard

---

## 4. Endpoint API

### `GET /rector?ies_id={id}`

**Lógica:**
1. Buscar IES en tabla `ies` por `id`. Si no existe → 404.
2. Obtener todas las `CarreraIES` de esa IES (JOIN con `carreras`).
3. Para cada carrera, obtener los KPIs más recientes desde `kpi_historico` donde `entidad_tipo='carrera'` y `entidad_id=carrera.id`. Construir `KpiResult` con los valores de D1 (score, iva, bes, vac) y D2 (score, ioe, ihe, iea).
4. Calcular alertas on-the-fly: carreras donde `d1_score > 0.7` (severidad alta si > 0.8, media si 0.7–0.8) o `d2_score < 0.4` (severidad alta si < 0.3, media si 0.3–0.4). Si ambas condiciones: tipo `'ambos'`.
5. Devolver respuesta completa.

**Respuesta exitosa (200):**
```json
{
  "ies": {
    "id": "abc123",
    "nombre": "Universidad Humanitas",
    "nombre_corto": "Humanitas"
  },
  "carreras": [
    {
      "id": "def456",
      "nombre": "Derecho",
      "matricula": 450,
      "kpi": {
        "d1_obsolescencia": { "score": 0.82, "iva": 0.75, "bes": 0.80, "vac": 0.90 },
        "d2_oportunidades": { "score": 0.35, "ioe": 0.40, "ihe": 0.30, "iea": 0.35 }
      }
    }
  ],
  "alertas": [
    {
      "id": "alerta-1",
      "carrera_nombre": "Derecho",
      "tipo": "ambos",
      "severidad": "alta",
      "titulo": "D1 crítico y D2 bajo",
      "mensaje": "D1 = 0.82 (umbral: 0.7) · D2 = 0.35 (umbral: 0.4)",
      "fecha": "2026-04-21T00:00:00"
    }
  ]
}
```

**Error 404:**
```json
{ "detail": "IES no encontrada" }
```

**Carreras sin KPIs:** se incluyen en la lista con `kpi: null`. El frontend las muestra como "Sin datos".

---

## 5. Tipos TypeScript

Se añaden a `frontend/src/lib/types.ts`:

```typescript
export interface IesInfo {
  id: string
  nombre: string
  nombre_corto: string | null
}

export interface CarreraKpi {
  id: string
  nombre: string
  matricula: number | null
  kpi: KpiResult | null
}

export interface AlertaItem {
  id: string
  carrera_nombre: string
  tipo: 'd1_alto' | 'd2_bajo' | 'ambos'
  severidad: 'alta' | 'media'
  titulo: string
  mensaje: string | null
  fecha: string
}

export interface RectorData {
  ies: IesInfo
  carreras: CarreraKpi[]
  alertas: AlertaItem[]
}
```

---

## 6. Función API cliente

Se añade a `frontend/src/lib/api.ts`:

```typescript
export async function getRectorData(iesId: number): Promise<RectorData> {
  const res = await fetch(`${BASE}/rector?ies_id=${iesId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}
```

---

## 7. Componentes Frontend

### `frontend/src/components/AlertasPanel.tsx`

Componente client-side. Recibe `alertas: AlertaItem[]`.

- Si vacío: mensaje "Sin alertas activas ✓" en verde
- Por cada alerta: badge de severidad (rojo=alta, amarillo=media), nombre de carrera, tipo (D1 alto / D2 bajo / Ambos), mensaje con scores, fecha relativa
- Ordenadas: alta primero, luego media

### `frontend/src/components/RectorCarrerasTable.tsx`

Componente client-side. Recibe `carreras: CarreraKpi[]`.

- Misma estructura de tabla BSC que `KpisTable.tsx`
- Columnas: Carrera, Matrícula, D1 (● + Score + IVA + BES + VAC), D2 (● + Score + IOE + IHE + IEA)
- Reutiliza la función `dotColor(value, isD1)` de KpisTable (extraída a un archivo compartido `frontend/src/lib/kpi-colors.ts`)
- Carreras sin KPI muestran "—" en todas las celdas de indicadores
- Ordenable por D1 o D2

### `frontend/src/components/RectorDashboard.tsx`

Componente client-side. Recibe `iesId: number`.

- Llama a `getRectorData(iesId)` en `useEffect`
- Layout: `grid grid-cols-[280px_1fr]` — AlertasPanel izquierda, RectorCarrerasTable derecha
- Header: nombre de la IES + nombre_corto
- Estados: cargando → "Cargando dashboard..." | error → mensaje | sin carreras → "Sin datos disponibles"

### `frontend/src/app/rector/page.tsx`

Componente server con `'use client'` por usar `useSearchParams`.

- Lee `ies_id` de los search params
- Si no hay `ies_id`: muestra "Selecciona una IES para continuar"
- Si hay `ies_id`: renderiza `<RectorDashboard iesId={Number(ies_id)} />`

---

## 8. Sidebar

Se añade enlace en `Sidebar.tsx`:

```typescript
{ href: '/rector', label: 'Rector', icon: '🏛' }
```

El enlace activo usa `usePathname()` igual que los enlaces existentes.

---

## 9. Tests

### `__tests__/api.test.ts` — 2 nuevos tests
- `getRectorData` retorna `RectorData` con ies, carreras y alertas
- `getRectorData` lanza error en respuesta no-OK

### `__tests__/AlertasPanel.test.tsx` — 2 tests
- Renderiza lista de alertas con severidad y carrera_nombre
- Muestra mensaje vacío cuando `alertas = []`

### `__tests__/RectorDashboard.test.tsx` — 3 tests
- Renderiza nombre de IES al cargar
- Muestra tabla de carreras
- Muestra panel de alertas

**Total tests después del sprint:** 19 (14 existentes + 5 nuevos tras refactor)

> **Nota sobre refactor:** La función `dotColor` actualmente está duplicada entre `KpisTable.tsx` y `RectorCarrerasTable.tsx`. Se extrae a `frontend/src/lib/kpi-colors.ts` como parte de este sprint. El test de `KpisTable` existente se actualiza para importar desde el nuevo módulo.

---

## 10. Estructura de archivos

**Nuevos:**
```
frontend/src/
  app/rector/page.tsx
  components/AlertasPanel.tsx
  components/RectorCarrerasTable.tsx
  components/RectorDashboard.tsx
  lib/kpi-colors.ts          ← extracción de dotColor desde KpisTable
__tests__/
  AlertasPanel.test.tsx
  RectorDashboard.test.tsx
api/routers/
  rector.py
```

**Modificados:**
```
frontend/src/lib/types.ts       ← +4 interfaces
frontend/src/lib/api.ts         ← +getRectorData
frontend/src/components/Sidebar.tsx  ← +enlace Rector
frontend/src/components/KpisTable.tsx ← importa dotColor desde kpi-colors.ts
api/main.py                     ← registra router rector
__tests__/api.test.ts           ← +2 tests
```

---

## 11. Dependencias

- No se añaden dependencias npm nuevas
- No se añaden dependencias Python nuevas
- Requiere que `kpi_historico` tenga datos (generados por el KPI runner del Sprint 2)
- Requiere que `ies` y `carrera_ies` tengan al menos una IES con carreras (seed data del Sprint 1)
