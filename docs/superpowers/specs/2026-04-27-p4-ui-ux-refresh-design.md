# P4 UI/UX Refresh: Diseño

**Fecha:** 2026-04-27  
**Estado:** Aprobado  
**Scope:** Theme layer Tailwind + componentes UI base + 4 páginas clave + deuda técnica crítica

---

## Contexto

El frontend actual usa Tailwind sin extensión de tema, sin design system formal, con paleta dispersa en lógica JS (`kpi-colors.ts`) y patrones repetidos (4 ranking charts D1-D6 casi idénticos, StatCard inline en AdminPanel, `bg-white rounded shadow p-4` en 12+ lugares). P4 establece el vocabulario visual del proyecto y lo aplica a los flujos de mayor tráfico.

---

## Sección 1 — Vocabulario Visual (Tailwind Theme Extension)

### Paleta de colores

```js
// tailwind.config.js — extend.colors
colors: {
  brand: {
    50:  '#eef2ff',  // indigo-50
    100: '#e0e7ff',
    600: '#4f46e5',  // indigo-600
    700: '#4338ca',
    900: '#312e81',
  },
  surface: {
    DEFAULT: '#ffffff',
    muted:   '#f8fafc',  // slate-50
    border:  '#e2e8f0',  // slate-200
  },
  risk: {
    50:  '#fef2f2',  // red-50
    600: '#dc2626',  // red-600
  },
  oportunidad: {
    50:  '#ecfdf5',  // emerald-50
    600: '#059669',  // emerald-600
  },
  neutro: {
    50:  '#f8fafc',  // slate-50/100
    500: '#64748b',  // slate-500
  },
}
```

**Fondos página:** `bg-slate-50` (body), `bg-white` (cards).  
**Headers de sección:** `text-slate-900` peso `font-semibold`.  
**Texto secundario:** `text-slate-500`.

### Tipografía

Fuente: **Geist Sans** vía paquete `geist` (`npm install geist`).  
Import en `layout.tsx`: `import { GeistSans } from 'geist/font/sans'`.  
Escala funcional (definida en `tailwind.config.js extend.fontFamily`):
```js
fontFamily: {
  sans: ['var(--font-geist-sans)', ...defaultTheme.fontFamily.sans],
}
```

### Radios y sombras

```js
borderRadius: { card: '0.75rem', btn: '0.5rem' }  // rounded-xl para cards, rounded-lg para botones
boxShadow: { card: '0 1px 3px 0 rgb(0 0 0 / 0.07)' }
```

---

## Sección 2 — Componentes UI Base (`frontend/src/components/ui/`)

### `ui/Card.tsx`

```tsx
interface CardProps { children: React.ReactNode; className?: string }
// bg-white rounded-xl shadow-card border border-surface-border p-6
```

Reemplaza el patrón `<div className="bg-white rounded-lg shadow p-4 border border-gray-200">` disperso en ~12 lugares.

### `ui/Badge.tsx`

```tsx
type Variant = 'risk' | 'oportunidad' | 'neutro' | 'default'
// risk: bg-risk-50 text-risk-600
// oportunidad: bg-oportunidad-50 text-oportunidad-600
// neutro: bg-neutro-50 text-neutro-500
```

Reemplaza badges inline en KpisTable, IesKpiCard, y páginas de detalle.

### `ui/StatCard.tsx`

```tsx
interface StatCardProps { label: string; value: string | number; icon?: React.ReactNode; trend?: number }
// Extrae el patrón repetido de AdminPanel y Homepage
```

### `ui/SectionHeader.tsx`

```tsx
interface SectionHeaderProps { title: string; subtitle?: string; action?: React.ReactNode }
// h2 text-slate-900 font-semibold text-xl + subtitle text-slate-500 text-sm
```

Estilo uniforme para todos los h2 de sección en Homepage, /kpis, /estadisticas.

---

## Sección 3 — Refactor de Deuda Técnica

### `CarrerasRanking.tsx` — Unificación D1/D2/D3/D6

Los 4 archivos `CarrerasRankingD1.tsx`…`D6.tsx` son casi idénticos. Se crea un único componente parametrizado:

```tsx
interface CarrerasRankingProps {
  dimension: 'D1' | 'D2' | 'D3' | 'D6'
  title: string
  colorFn: (value: number) => string
}
```

Los 4 archivos originales se eliminan; `CarrerasRankingPanel.tsx` importa el nuevo componente.

---

## Sección 4 — Páginas Intervenidas

### Homepage `/`

- `StatCard` de `ui/` para los 4 contadores (IES, carreras, vacantes, noticias)
- `SectionHeader` para "Top riesgo" y "Top oportunidades"
- Cards de noticias recientes con `ui/Card`
- Tipografía jerarquizada: hero en `text-3xl font-bold text-slate-900`

### `/kpis`

- Tabla con `bg-surface-muted` en header, `border-surface-border` en filas
- Filtros con `ui/Badge` para variante activa/inactiva
- Paginación consistente con botones `rounded-btn`
- `SectionHeader` en cada tab

### `/carreras/[id]`

- Layout 2 columnas: KPI bars izquierda (2/3) + semáforo predictivo derecha (1/3)
- `FanChart` más prominente (`h-72` → `h-96`)
- Semáforo: tarjetas con `ui/Badge` para cada horizonte (1/3/5 años)
- Historial D1/D2 con mini chart usando `ui/Card`

### Sidebar

- Agrupación visual por secciones: **Explorar** (/, noticias, vacantes, carreras, IES) | **Análisis** (kpis, estadísticas, comparar) | **Rector** (rector) | **Admin** (admin)
- Separadores con `text-slate-400 text-xs uppercase tracking-widest` para labels de sección
- `hover:bg-brand-50 hover:text-brand-700` en lugar de `hover:bg-gray-100`
- ítem activo: `bg-brand-50 text-brand-700 font-medium border-l-2 border-brand-600`

---

## Sección 5 — Fuera de Scope

- Rediseño de `/rector`, `/admin`, `/impacto`, `/metodologia`
- Dark mode
- Animaciones (framer-motion, etc.)
- Migración a Radix UI / shadcn
- Páginas de detalle secundarias: `/noticias/[id]`, `/vacantes/[id]`, `/ies/[id]`
- Tests E2E adicionales

---

## Sección 6 — Archivos a Crear / Modificar

**Crear:**
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Badge.tsx`
- `frontend/src/components/ui/StatCard.tsx`
- `frontend/src/components/ui/SectionHeader.tsx`
- `frontend/src/components/CarrerasRanking.tsx`

**Modificar:**
- `frontend/tailwind.config.js` — extend colors, fontFamily, borderRadius, boxShadow
- `frontend/src/app/layout.tsx` — cargar Geist Sans via next/font
- `frontend/src/app/globals.css` — body bg-slate-50, font-sans
- `frontend/src/components/Sidebar.tsx` — secciones + hover states
- `frontend/src/app/page.tsx` — usar ui/StatCard, ui/Card, ui/SectionHeader
- `frontend/src/components/KpisTable.tsx` — tabla con nuevo theme, ui/Badge
- `frontend/src/app/carreras/[id]/page.tsx` — layout 2 columnas, FanChart grande
- `frontend/src/components/CarrerasRankingPanel.tsx` — usar CarrerasRanking unificado

**Eliminar:**
- `frontend/src/components/CarrerasRankingD1.tsx`
- `frontend/src/components/CarrerasRankingD2.tsx`
- `frontend/src/components/CarrerasRankingD3.tsx`
- `frontend/src/components/CarrerasRankingD6.tsx`

---

## Orden de Implementación

1. Tailwind config + Geist font (base de todo lo demás)
2. Componentes `ui/` (Card, Badge, StatCard, SectionHeader)
3. Sidebar refactorizado
4. CarrerasRanking unificado
5. Homepage con nuevos ui/
6. `/kpis` con nuevo DataTable
7. `/carreras/[id]` layout 2 columnas
