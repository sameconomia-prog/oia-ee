# P4 UI/UX Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use **model: opus** for all subagents.

**Goal:** Establecer un vocabulario visual formal (Geist + paleta Slate/Indigo) y aplicarlo a los 4 flujos de mayor tráfico — Homepage, /kpis, /carreras/[id], Sidebar — eliminando deuda técnica crítica (4 ranking charts duplicados).

**Architecture:** Theme Layer primero (tailwind.config.js + font) → primitivos UI reutilizables (`ui/`) → Sidebar → componente unificado CarrerasRanking → páginas en orden de tráfico. Cada tarea es autónoma y deja el TypeScript en 0 errores.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, `geist` npm package, TypeScript strict.

---

## Archivos

| Acción | Archivo |
|--------|---------|
| Modify | `frontend/tailwind.config.js` |
| Modify | `frontend/src/app/layout.tsx` |
| Modify | `frontend/src/app/globals.css` |
| Create | `frontend/src/components/ui/Card.tsx` |
| Create | `frontend/src/components/ui/Badge.tsx` |
| Create | `frontend/src/components/ui/StatCard.tsx` |
| Create | `frontend/src/components/ui/SectionHeader.tsx` |
| Modify | `frontend/src/components/Sidebar.tsx` |
| Create | `frontend/src/components/CarrerasRanking.tsx` |
| Modify | `frontend/src/components/CarrerasRankingPanel.tsx` |
| Delete | `frontend/src/components/CarrerasRankingD1.tsx` |
| Delete | `frontend/src/components/CarrerasRankingD2.tsx` |
| Delete | `frontend/src/components/CarrerasRankingD3.tsx` |
| Delete | `frontend/src/components/CarrerasRankingD6.tsx` |
| Modify | `frontend/src/app/page.tsx` |
| Modify | `frontend/src/app/kpis/page.tsx` |
| Modify | `frontend/src/components/KpisTable.tsx` |
| Modify | `frontend/src/app/carreras/[id]/page.tsx` |

---

## Task 1: Tailwind Theme Extension + Geist Font

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Instalar paquete geist**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npm install geist
```

Expected: `added 1 package` sin errores.

- [ ] **Step 2: Reemplazar tailwind.config.js**

```js
// frontend/tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Actualizar layout.tsx**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: {
    default: 'OIA-EE — Observatorio IA · Empleo · Educación',
    template: '%s | OIA-EE',
  },
  description: 'Monitoreo en tiempo real del impacto de la IA en educación y empleo en México. Rankings D1-D7, comparación IES, alertas y tendencias.',
  keywords: ['IA', 'educación', 'empleo', 'México', 'KPIs', 'observatorio', 'automatización'],
  openGraph: {
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: 'Rankings D1–D7 de carreras por riesgo de automatización. Datos abiertos sobre IES en México.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'OIA-EE',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={GeistSans.variable}>
      <body className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Actualizar globals.css**

```css
/* frontend/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply text-slate-900 antialiased;
  }
}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 6: Commit**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE && git add frontend/tailwind.config.js frontend/src/app/layout.tsx frontend/src/app/globals.css frontend/package.json frontend/package-lock.json && git commit -m "feat(p4): tailwind theme extension + Geist Sans font"
```

---

## Task 2: Componentes UI Base (`ui/`)

**Files:**
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/StatCard.tsx`
- Create: `frontend/src/components/ui/SectionHeader.tsx`

- [ ] **Step 1: Crear ui/Card.tsx**

```tsx
// frontend/src/components/ui/Card.tsx
import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-card border border-slate-200 p-6 ${className}`}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Crear ui/Badge.tsx**

```tsx
// frontend/src/components/ui/Badge.tsx
import { type ReactNode } from 'react'

type Variant = 'risk' | 'oportunidad' | 'neutro' | 'default'

const VARIANTS: Record<Variant, string> = {
  risk:        'bg-red-50 text-red-600',
  oportunidad: 'bg-emerald-50 text-emerald-600',
  neutro:      'bg-slate-100 text-slate-500',
  default:     'bg-brand-50 text-brand-600',
}

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 3: Crear ui/StatCard.tsx**

```tsx
// frontend/src/components/ui/StatCard.tsx
import { type ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  valueClassName?: string
  icon?: ReactNode
}

export default function StatCard({ label, value, sub, valueClassName = 'text-brand-600', icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-slate-400 text-lg">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${valueClassName}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Crear ui/SectionHeader.tsx**

```tsx
// frontend/src/components/ui/SectionHeader.tsx
import { type ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 6: Commit**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE && git add frontend/src/components/ui/ && git commit -m "feat(p4): componentes ui base — Card, Badge, StatCard, SectionHeader"
```

---

## Task 3: Sidebar Refactorizado

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`

Los cambios clave:
- Secciones agrupadas: Explorar / Análisis / Acceso
- Active state: `bg-slate-800 text-white border-l-2 border-indigo-400 font-medium`
- Hover: `hover:bg-slate-800 hover:text-slate-100`
- Labels de sección: texto pequeño uppercase separador visual

- [ ] **Step 1: Reemplazar Sidebar.tsx**

```tsx
// frontend/src/components/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isAuthenticated, clearAuth } from '@/lib/auth'

const SECTIONS = [
  {
    label: 'Explorar',
    links: [
      { href: '/', label: 'Inicio' },
      { href: '/noticias', label: 'Noticias' },
      { href: '/vacantes', label: 'Vacantes' },
      { href: '/ies', label: 'Instituciones' },
      { href: '/carreras', label: 'Carreras' },
    ],
  },
  {
    label: 'Análisis',
    links: [
      { href: '/kpis', label: 'KPIs' },
      { href: '/estadisticas', label: 'Estadísticas' },
      { href: '/impacto', label: 'Impacto IA' },
      { href: '/comparar', label: 'Comparar IES' },
      { href: '/metodologia', label: 'Metodología' },
    ],
  },
  {
    label: 'Acceso',
    links: [
      { href: '/rector', label: 'Rector' },
      { href: '/admin', label: 'Administración' },
    ],
  },
]

function isActive(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [pathname])

  function handleLogout() {
    clearAuth()
    setAuthed(false)
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-slate-900 text-slate-100 min-h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-700/60">
        <h1 className="font-bold text-base tracking-tight">OIA-EE</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Observatorio IA · Empleo · Educación</p>
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {section.label}
            </p>
            {section.links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-3 py-1.5 rounded-md mb-0.5 text-sm transition-colors ${
                  isActive(href, pathname)
                    ? 'bg-slate-800 text-white border-l-2 border-indigo-400 font-medium pl-[10px]'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {authed && (
        <div className="p-2 border-t border-slate-700/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-1.5 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE && git add frontend/src/components/Sidebar.tsx && git commit -m "feat(p4): sidebar con secciones agrupadas y brand color active state"
```

---

## Task 4: CarrerasRanking Unificado (D1/D2/D3/D6 → 1 componente)

**Files:**
- Create: `frontend/src/components/CarrerasRanking.tsx`
- Modify: `frontend/src/components/CarrerasRankingPanel.tsx`
- Delete: `CarrerasRankingD1.tsx`, `D2.tsx`, `D3.tsx`, `D6.tsx`

- [ ] **Step 1: Crear CarrerasRanking.tsx**

```tsx
// frontend/src/components/CarrerasRanking.tsx
'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getCarrerasPublico } from '@/lib/api'
import type { CarreraKpi, KpiResult } from '@/lib/types'

export interface DimConfig {
  dimKey: 'D1' | 'D2' | 'D3' | 'D6'
  extract: (kpi: KpiResult) => { score: number; subFields: Record<string, number> }
  subFieldLabels: Array<{ key: string; label: string }>
  invert: boolean
  sortLabel: string
  csvFilename: string
  legend: string
}

export const DIM_CONFIGS: Record<'D1' | 'D2' | 'D3' | 'D6', DimConfig> = {
  D1: {
    dimKey: 'D1',
    extract: (kpi) => ({
      score: kpi.d1_obsolescencia.score,
      subFields: { iva: kpi.d1_obsolescencia.iva, bes: kpi.d1_obsolescencia.bes, vac: kpi.d1_obsolescencia.vac },
    }),
    subFieldLabels: [{ key: 'iva', label: 'IVA' }, { key: 'bes', label: 'BES' }, { key: 'vac', label: 'VAC' }],
    invert: true,
    sortLabel: 'mayor riesgo primero',
    csvFilename: 'ranking_d1_carreras',
    legend: 'D1 Obsolescencia · IVA: vulnerabilidad · BES: brecha curricular · VAC: velocidad cambio',
  },
  D2: {
    dimKey: 'D2',
    extract: (kpi) => ({
      score: kpi.d2_oportunidades.score,
      subFields: { ioe: kpi.d2_oportunidades.ioe, ihe: kpi.d2_oportunidades.ihe, iea: kpi.d2_oportunidades.iea },
    }),
    subFieldLabels: [{ key: 'ioe', label: 'IOE ↑' }, { key: 'ihe', label: 'IHE ↑' }, { key: 'iea', label: 'IEA ↑' }],
    invert: false,
    sortLabel: 'mayor oportunidad primero',
    csvFilename: 'ranking_d2_carreras',
    legend: 'D2 Oportunidades · IOE: oportunidades empleo · IHE: habilitación emergente · IEA: empleabilidad ajustada',
  },
  D3: {
    dimKey: 'D3',
    extract: (kpi) => ({
      score: kpi.d3_mercado.score,
      subFields: { tdm: kpi.d3_mercado.tdm, tvc: kpi.d3_mercado.tvc, brs: kpi.d3_mercado.brs, ice: kpi.d3_mercado.ice },
    }),
    subFieldLabels: [{ key: 'tdm', label: 'TDM' }, { key: 'tvc', label: 'TVC' }, { key: 'brs', label: 'BRS' }, { key: 'ice', label: 'ICE' }],
    invert: false,
    sortLabel: 'mayor relevancia primero',
    csvFilename: 'ranking_d3_carreras',
    legend: 'D3 Mercado Laboral · TDM: demanda en mercado · TVC: tendencia vacantes IA · BRS: brecha reskilling · ICE: competencias emergentes',
  },
  D6: {
    dimKey: 'D6',
    extract: (kpi) => ({
      score: kpi.d6_estudiantil.score,
      subFields: { iei: kpi.d6_estudiantil.iei, crc: kpi.d6_estudiantil.crc, roi_e: kpi.d6_estudiantil.roi_e },
    }),
    subFieldLabels: [{ key: 'iei', label: 'IEI' }, { key: 'crc', label: 'CRC' }, { key: 'roi_e', label: 'ROI-E' }],
    invert: false,
    sortLabel: 'mayor retorno primero',
    csvFilename: 'ranking_d6_carreras',
    legend: 'D6 Perfil Estudiantil · IEI: eficiencia inversión · CRC: retorno competencias · ROI-E: retorno inversión educativa',
  },
}

function scoreBadgeClass(s: number, invert: boolean): string {
  const isHigh = s >= 0.6
  const isMid = s >= 0.4 && s < 0.6
  if (invert) {
    if (isHigh) return 'text-red-700 bg-red-50'
    if (isMid) return 'text-yellow-700 bg-yellow-50'
    return 'text-emerald-700 bg-emerald-50'
  }
  if (isHigh) return 'text-emerald-700 bg-emerald-50'
  if (isMid) return 'text-yellow-700 bg-yellow-50'
  return 'text-red-700 bg-red-50'
}

function scoreTextClass(s: number, invert: boolean): string {
  const isHigh = s >= 0.6
  const isMid = s >= 0.4 && s < 0.6
  if (invert) {
    if (isHigh) return 'text-red-700'
    if (isMid) return 'text-yellow-700'
    return 'text-emerald-700'
  }
  if (isHigh) return 'text-emerald-700'
  if (isMid) return 'text-yellow-700'
  return 'text-red-700'
}

type RowData = { id: string; nombre: string; score: number; subFields: Record<string, number> }

interface CarrerasRankingProps {
  config: DimConfig
  filterQuery?: string
}

export default function CarrerasRanking({ config, filterQuery = '' }: CarrerasRankingProps) {
  const [raw, setRaw] = useState<CarreraKpi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCarrerasPublico({ limit: 500 })
      .then(setRaw)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const datos: RowData[] = useMemo(() => {
    return raw
      .filter((c): c is CarreraKpi & { kpi: NonNullable<CarreraKpi['kpi']> } => c.kpi !== null)
      .map(c => {
        const { score, subFields } = config.extract(c.kpi!)
        return { id: c.id, nombre: c.nombre, score, subFields }
      })
      .sort((a, b) => b.score - a.score)
      .filter(d => !filterQuery || d.nombre.toLowerCase().includes(filterQuery.toLowerCase()))
  }, [raw, filterQuery, config])

  const stats = useMemo(() => {
    if (datos.length === 0) return null
    const scores = datos.map(d => d.score)
    const promedio = scores.reduce((a, b) => a + b, 0) / scores.length
    const alto = scores.filter(s => s >= 0.6).length
    const medio = scores.filter(s => s >= 0.4 && s < 0.6).length
    const bajo = scores.filter(s => s < 0.4).length
    return { promedio, alto, medio, bajo, mayor: datos[0], menor: datos[datos.length - 1] }
  }, [datos])

  function exportarCSV() {
    if (datos.length === 0) return
    const subCols = config.subFieldLabels.map(f => f.label.replace(' ↑', '')).join(',')
    const header = `#,Carrera,${config.dimKey} Score,${subCols}`
    const rows = datos.map(({ nombre, score, subFields }, i) => {
      const subs = config.subFieldLabels.map(f => subFields[f.key].toFixed(4)).join(',')
      return `${i + 1},"${nombre}",${score.toFixed(4)},${subs}`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.csvFilename}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">Cargando carreras...</p>
  if (error) return <p className="text-sm text-red-500 py-4">Error: {error}</p>
  if (datos.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">Sin datos de carreras.</p>

  const { invert } = config

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-400">
          {datos.length} carreras · ordenado por {config.dimKey} Score ({config.sortLabel})
        </span>
        <button
          onClick={exportarCSV}
          className="ml-auto px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      {stats && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs text-slate-500 mb-1">Promedio {config.dimKey} nacional</p>
            <p className={`text-lg font-mono font-semibold ${scoreTextClass(stats.promedio, invert)}`}>
              {stats.promedio.toFixed(3)}
            </p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs text-slate-500 mb-1">
              {invert ? 'Mayor riesgo' : 'Mayor potencial'}
            </p>
            <p className={`text-sm font-semibold truncate ${invert ? 'text-red-700' : 'text-emerald-700'}`}>
              {stats.mayor.nombre}
            </p>
            <p className={`text-xs font-mono ${invert ? 'text-red-600' : 'text-emerald-600'}`}>
              {stats.mayor.score.toFixed(3)}
            </p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs text-slate-500 mb-1">
              {invert ? 'Menor riesgo' : 'Menor potencial'}
            </p>
            <p className={`text-sm font-semibold truncate ${invert ? 'text-emerald-700' : 'text-red-700'}`}>
              {stats.menor.nombre}
            </p>
            <p className={`text-xs font-mono ${invert ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.menor.score.toFixed(3)}
            </p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs text-slate-500 mb-2">Distribución</p>
            <div className="flex gap-2 text-xs font-semibold">
              {invert ? (
                <>
                  <span className="text-red-700">{stats.alto} alto</span>
                  <span className="text-yellow-700">{stats.medio} med</span>
                  <span className="text-emerald-700">{stats.bajo} bajo</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-700">{stats.alto} alto</span>
                  <span className="text-yellow-700">{stats.medio} med</span>
                  <span className="text-red-700">{stats.bajo} bajo</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left w-8">#</th>
              <th className="px-4 py-2 text-left">Carrera</th>
              <th className="px-4 py-2 text-center">{config.dimKey} Score</th>
              {config.subFieldLabels.map(f => (
                <th key={f.key} className="px-4 py-2 text-center">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map(({ id, nombre, score, subFields }, i) => (
              <tr key={id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-400 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-slate-700">
                  <Link href={`/carreras/${id}`} className="hover:text-brand-700 hover:underline">
                    {nombre}
                  </Link>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${scoreBadgeClass(score, invert)}`}>
                    {score.toFixed(2)}
                  </span>
                </td>
                {config.subFieldLabels.map(f => (
                  <td key={f.key} className="px-4 py-2 text-center font-mono text-xs text-slate-500">
                    {subFields[f.key].toFixed(3)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 px-4 py-2 bg-slate-50 border-t border-slate-100">
          {config.legend}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar CarrerasRankingPanel.tsx**

```tsx
// frontend/src/components/CarrerasRankingPanel.tsx
'use client'
import { useState } from 'react'
import CarrerasRanking, { DIM_CONFIGS } from './CarrerasRanking'

type Dim = 'D1' | 'D2' | 'D3' | 'D6'

const DIMS: { key: Dim; label: string; sub: string }[] = [
  { key: 'D1', label: 'D1 Obsolescencia', sub: 'Mayor score = mayor riesgo' },
  { key: 'D2', label: 'D2 Oportunidades', sub: 'Mayor score = mayor potencial' },
  { key: 'D3', label: 'D3 Mercado Laboral', sub: 'Mayor score = mayor relevancia' },
  { key: 'D6', label: 'D6 Perfil Estudiantil', sub: 'Mayor score = mayor retorno' },
]

export default function CarrerasRankingPanel() {
  const [dim, setDim] = useState<Dim>('D1')
  const [filterQuery, setFilterQuery] = useState('')

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {DIMS.map(d => (
          <button
            key={d.key}
            onClick={() => setDim(d.key)}
            className={`flex flex-col items-start px-4 py-2 rounded-lg border text-left transition-colors ${
              dim === d.key
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-sm font-semibold">{d.label}</span>
            <span className="text-xs text-slate-400">{d.sub}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center">
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filtrar carrera..."
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="ml-1 text-slate-400 hover:text-slate-700 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <CarrerasRanking config={DIM_CONFIGS[dim]} filterQuery={filterQuery} />
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript antes de eliminar**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Eliminar archivos duplicados**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend/src/components
rm CarrerasRankingD1.tsx CarrerasRankingD2.tsx CarrerasRankingD3.tsx CarrerasRankingD6.tsx
```

- [ ] **Step 5: Verificar TypeScript tras eliminación**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores (confirmar que no hay imports huérfanos).

- [ ] **Step 6: Commit**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE && git add frontend/src/components/CarrerasRanking.tsx frontend/src/components/CarrerasRankingPanel.tsx && git rm frontend/src/components/CarrerasRankingD1.tsx frontend/src/components/CarrerasRankingD2.tsx frontend/src/components/CarrerasRankingD3.tsx frontend/src/components/CarrerasRankingD6.tsx && git commit -m "refactor(p4): unificar CarrerasRanking D1/D2/D3/D6 en componente parametrizado"
```

---

## Task 5: Homepage con ui/ Components

**Files:**
- Modify: `frontend/src/app/page.tsx`

Cambios: reemplazar `StatCard` inline por `ui/StatCard`, añadir `SectionHeader` a secciones, `ui/Card` en paneles, y ajustar colores a paleta slate/brand.

- [ ] **Step 1: Reemplazar page.tsx**

```tsx
// frontend/src/app/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getResumenPublico, getKpisNacionalResumen, getVacantesTopSkills, getTopRiesgo, getTopOportunidades, getIesPublico } from '@/lib/api'
import type { ResumenPublico, KpisNacionalResumen, SkillFreq, TopRiesgoItem, IesInfo } from '@/lib/types'
import TendenciasNacionalesChart from '@/components/TendenciasNacionalesChart'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'
import Badge from '@/components/ui/Badge'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const IMPACTO_VARIANT: Record<string, 'risk' | 'oportunidad' | 'neutro'> = {
  riesgo: 'risk',
  oportunidad: 'oportunidad',
  neutro: 'neutro',
}

export default function HomePage() {
  const [data, setData] = useState<ResumenPublico | null>(null)
  const [kpisNac, setKpisNac] = useState<KpisNacionalResumen | null>(null)
  const [topSkills, setTopSkills] = useState<SkillFreq[]>([])
  const [topRiesgo, setTopRiesgo] = useState<TopRiesgoItem[]>([])
  const [topOportunidades, setTopOportunidades] = useState<TopRiesgoItem[]>([])
  const [iesList, setIesList] = useState<IesInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getResumenPublico()
      .then(setData)
      .catch((e: Error) => setError(e.message))
    getKpisNacionalResumen().then(setKpisNac).catch(() => {})
    getVacantesTopSkills(12).then(setTopSkills).catch(() => {})
    getTopRiesgo(5).then(setTopRiesgo).catch(() => {})
    getTopOportunidades(5).then(setTopOportunidades).catch(() => {})
    getIesPublico().then(setIesList).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium mb-3">
          Plataforma de análisis · México
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Observatorio de Indicadores<br />
          <span className="text-brand-600">IA · Empleo · Educación</span>
        </h1>
        <p className="text-slate-500 text-sm max-w-xl">
          Monitoreo en tiempo real de tendencias de automatización, riesgo laboral y
          oportunidades de actualización curricular para instituciones de educación superior en México.
        </p>
        <div className="flex gap-3 mt-4">
          <Link
            href="/rector"
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
          >
            Acceso rectores →
          </Link>
          <Link
            href="/noticias"
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Ver noticias
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4">Error cargando datos: {error}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="IES monitoreadas"
          value={data?.total_ies ?? '—'}
          sub="Instituciones activas"
        />
        <StatCard
          label="Noticias analizadas"
          value={data?.total_noticias ?? '—'}
          sub="Con clasificación IA"
          valueClassName="text-slate-800"
        />
        <StatCard
          label="Vacantes IA"
          value={data?.total_vacantes ?? '—'}
          sub="Empleos indexados"
        />
        <StatCard
          label="Alertas activas"
          value={data?.alertas_activas ?? '—'}
          sub="Sin leer por rectores"
          valueClassName={data && data.alertas_activas > 0 ? 'text-red-500' : 'text-slate-800'}
        />
      </div>

      {/* Promedios nacionales KPI */}
      {kpisNac && kpisNac.total_carreras > 0 && (
        <Card className="mb-8 p-5">
          <SectionHeader
            title={`Promedios nacionales · ${kpisNac.total_carreras} carreras`}
            action={
              <div className="flex gap-2 text-xs">
                <Badge variant="risk">{kpisNac.carreras_riesgo_alto} riesgo alto (D1)</Badge>
                <Badge variant="oportunidad">{kpisNac.carreras_oportunidad_alta} alta oportunidad (D2)</Badge>
              </div>
            }
          />
          <div className="grid grid-cols-4 gap-3">
            {([
              { dim: 'D1', label: 'Obsolescencia', val: kpisNac.promedio_d1, invert: true },
              { dim: 'D2', label: 'Oportunidades', val: kpisNac.promedio_d2, invert: false },
              { dim: 'D3', label: 'Mercado Laboral', val: kpisNac.promedio_d3, invert: false },
              { dim: 'D6', label: 'Perfil Estudiantil', val: kpisNac.promedio_d6, invert: false },
            ] as { dim: string; label: string; val: number; invert: boolean }[]).map(({ dim, label, val, invert }) => {
              const good = invert ? val < 0.4 : val >= 0.6
              const warn = val >= 0.4 && val < 0.6
              const color = good ? 'text-emerald-700' : warn ? 'text-yellow-700' : 'text-red-700'
              return (
                <div key={dim} className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-mono font-bold text-slate-500 mb-1">{dim}</p>
                  <p className={`text-xl font-bold font-mono ${color}`}>{val.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Tendencias nacionales */}
      <TendenciasNacionalesChart dias={30} />

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { href: '/carreras', title: 'Explorar Carreras', desc: 'Busca cualquier carrera y consulta su riesgo D1, oportunidades D2 y más' },
          { href: '/vacantes', title: 'Vacantes IA', desc: 'Empleos que demandan habilidades de inteligencia artificial en México' },
          { href: '/comparar', title: 'Comparar IES', desc: 'Análisis D4 de dos instituciones lado a lado' },
          { href: '/kpis', title: 'Rankings Detallados', desc: 'D1 Obsolescencia · D2 Oportunidades · D3 Mercado · D6 Estudiantil' },
        ].map(({ href, title, desc }) => (
          <Link
            key={href + title}
            href={href}
            className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-card hover:border-brand-600/40 hover:shadow-md transition-all"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm mb-0.5">{title}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Top carreras en riesgo */}
      {topRiesgo.length > 0 && (
        <Card className="mb-8 p-5 border-red-100">
          <SectionHeader
            title="Carreras con mayor riesgo de obsolescencia"
            subtitle="D1 más alto"
            action={<Link href="/kpis" className="text-xs text-brand-600 hover:underline">Ver rankings →</Link>}
          />
          <div className="space-y-2">
            {topRiesgo.map((c, i) => (
              <div key={c.carrera_id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono w-4">{i + 1}.</span>
                <Link href={`/carreras/${c.carrera_id}`} className="flex-1 text-sm text-slate-700 hover:text-brand-700 hover:underline">{c.nombre}</Link>
                <div className="flex gap-2">
                  <Badge variant="risk">D1 {c.d1_score.toFixed(2)}</Badge>
                  <Badge variant="neutro">D2 {c.d2_score.toFixed(2)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top carreras con oportunidad */}
      {topOportunidades.length > 0 && (
        <Card className="mb-8 p-5 border-emerald-100">
          <SectionHeader
            title="Carreras con mayor oportunidad de actualización"
            subtitle="D2 más alto"
            action={<Link href="/kpis" className="text-xs text-brand-600 hover:underline">Ver rankings →</Link>}
          />
          <div className="space-y-2">
            {topOportunidades.map((c, i) => (
              <div key={c.carrera_id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono w-4">{i + 1}.</span>
                <Link href={`/carreras/${c.carrera_id}`} className="flex-1 text-sm text-slate-700 hover:text-brand-700 hover:underline">{c.nombre}</Link>
                <div className="flex gap-2">
                  <Badge variant="neutro">D1 {c.d1_score.toFixed(2)}</Badge>
                  <Badge variant="oportunidad">D2 {c.d2_score.toFixed(2)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Skills más demandadas */}
      {topSkills.length > 0 && (
        <Card className="mb-8 p-5">
          <SectionHeader title="Skills más demandadas" subtitle="Mercado laboral" />
          <div className="flex flex-wrap gap-2">
            {topSkills.map((s) => (
              <span
                key={s.nombre}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium"
              >
                {s.nombre}
                <span className="bg-brand-100 text-brand-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {s.count}
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Instituciones monitoreadas */}
      {iesList.length > 0 && (
        <Card className="mb-8 p-5">
          <SectionHeader
            title="Instituciones monitoreadas"
            action={<Link href="/ies" className="text-xs text-brand-600 hover:underline">Ver todas →</Link>}
          />
          <div className="flex flex-wrap gap-2">
            {iesList.map(ies => (
              <Link
                key={ies.id}
                href={`/ies/${ies.id}`}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:border-brand-600/40 hover:text-brand-700 hover:bg-brand-50 transition-colors"
              >
                {ies.nombre_corto ?? ies.nombre}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Noticias recientes */}
      <Card className="mb-8 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900 text-sm">Noticias recientes</h2>
          <Link href="/noticias" className="text-xs text-brand-600 hover:underline">Ver todas →</Link>
        </div>
        {!data && !error && (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">Cargando...</p>
        )}
        {data && data.noticias_recientes.length === 0 && (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">Sin noticias aún.</p>
        )}
        {data && data.noticias_recientes.map((n) => (
          <div key={n.id} className="flex items-start gap-3 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
            <div className="flex-1 min-w-0">
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-800 hover:underline line-clamp-1"
              >
                {n.titulo}
              </a>
              <p className="text-xs text-slate-400 mt-0.5">
                {n.fuente} · {n.sector ?? 'sin sector'} · {formatDate(n.fecha_pub)}
              </p>
            </div>
            {n.tipo_impacto && (
              <Badge variant={IMPACTO_VARIANT[n.tipo_impacto] ?? 'neutro'} className="shrink-0">
                {n.tipo_impacto}
              </Badge>
            )}
          </div>
        ))}
      </Card>

      <p className="text-center text-xs text-slate-400 mt-8">
        OIA-EE · Datos procesados con IA · Actualización diaria
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE && git add frontend/src/app/page.tsx && git commit -m "feat(p4): homepage con StatCard/Card/SectionHeader/Badge y paleta slate/brand"
```

---

## Task 6: /kpis — Tabs con Brand Colors + KpisTable

**Files:**
- Modify: `frontend/src/app/kpis/page.tsx`
- Modify: `frontend/src/components/KpisTable.tsx`

- [ ] **Step 1: Actualizar kpis/page.tsx**

```tsx
// frontend/src/app/kpis/page.tsx
'use client'
import { useState } from 'react'
import KpisTable from '@/components/KpisTable'
import EstadoKpiSection from '@/components/EstadoKpiSection'
import NoticiasKpiSection from '@/components/NoticiasKpiSection'
import EstadoRankingNacional from '@/components/EstadoRankingNacional'
import CarrerasRankingPanel from '@/components/CarrerasRankingPanel'

type Tab = 'carreras' | 'estado' | 'ranking_d5' | 'noticias' | 'ranking_carreras'

const TABS: { key: Tab; label: string }[] = [
  { key: 'carreras', label: 'D1–D3–D6 por Carrera' },
  { key: 'estado', label: 'D5 Geografía por Estado' },
  { key: 'ranking_d5', label: 'D5 Ranking Nacional' },
  { key: 'ranking_carreras', label: 'Ranking Carreras' },
  { key: 'noticias', label: 'D7 Noticias (Global)' },
]

export default function KpisPage() {
  const [tab, setTab] = useState<Tab>('carreras')

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-5">KPIs del Observatorio</h1>
      <div className="flex gap-1 mb-6 border-b border-slate-200 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`pb-2.5 px-3 text-sm border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-brand-600 text-brand-700 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'carreras' && <KpisTable />}
      {tab === 'estado' && <EstadoKpiSection />}
      {tab === 'ranking_d5' && <EstadoRankingNacional />}
      {tab === 'ranking_carreras' && <CarrerasRankingPanel />}
      {tab === 'noticias' && <NoticiasKpiSection />}
    </div>
  )
}
```

- [ ] **Step 2: Actualizar KpisTable.tsx — header y filas con paleta slate/brand**

Reemplazar los colores `gray-` del encabezado y filas con `slate-`:

```tsx
// frontend/src/components/KpisTable.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCarrerasPublico } from '@/lib/api'
import { dotColor, textColor } from '@/lib/kpi-colors'
import type { CarreraKpi } from '@/lib/types'

const PAGE_SIZE = 25

type SortKey = 'd1' | 'd2' | 'd3' | 'd6'
type SortDir = 'asc' | 'desc'

function Dot({ value, isD1 }: { value: number; isD1: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${dotColor(value, isD1)}`}
    />
  )
}

function Bar({ value, isD1 }: { value: number; isD1: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-11 bg-slate-200 rounded h-1.5">
        <div
          className={`${dotColor(value, isD1)} h-1.5 rounded`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className={`text-xs ${textColor(value, isD1)}`}>{value.toFixed(2)}</span>
    </div>
  )
}

function Sub({ value, isD1 }: { value: number; isD1: boolean }) {
  return <span className={`text-xs ${textColor(value, isD1)}`}>{value.toFixed(2)}</span>
}

export default function KpisTable() {
  const [rows, setRows] = useState<CarreraKpi[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('d1')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getCarrerasPublico({ skip: 0, limit: PAGE_SIZE })
      .then((data) => {
        setRows(data)
        setSkip(data.length)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const data = await getCarrerasPublico({ skip, limit: PAGE_SIZE })
      setRows(prev => [...prev, ...data])
      setSkip(s => s + data.length)
      setHasMore(data.length === PAGE_SIZE)
    } catch { /* silencioso */ }
    finally { setLoadingMore(false) }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const withKpi = rows.filter(r => r.kpi !== null)
  const sorted = [...withKpi].sort((a, b) => {
    const scoreOf = (row: CarreraKpi) => {
      const k = row.kpi!
      if (sortKey === 'd1') return k.d1_obsolescencia.score
      if (sortKey === 'd2') return k.d2_oportunidades.score
      if (sortKey === 'd3') return k.d3_mercado.score
      return k.d6_estudiantil.score
    }
    return sortDir === 'desc' ? scoreOf(b) - scoreOf(a) : scoreOf(a) - scoreOf(b)
  })

  function arrow(key: SortKey) {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

  if (loading) return <p className="text-slate-400 py-8">Cargando KPIs...</p>
  if (error) return <p className="text-red-500 py-8">Error: {error}</p>
  if (sorted.length === 0)
    return <p className="text-slate-400 py-8">Sin datos de KPIs disponibles. Ejecuta "Seed Demo" en el panel admin.</p>

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-center">
              <th className="px-3 py-2 border-b border-slate-200 text-left" rowSpan={2}>
                Carrera
              </th>
              <th colSpan={5} className="px-2 py-1.5 border-b border-l-4 border-l-red-300 bg-red-50 text-red-800 tracking-wide">
                D1 — OBSOLESCENCIA
              </th>
              <th colSpan={5} className="px-2 py-1.5 border-b border-l-4 border-l-emerald-300 bg-emerald-50 text-emerald-800 tracking-wide">
                D2 — OPORTUNIDADES
              </th>
              <th colSpan={2} className="px-2 py-1.5 border-b border-l-4 border-l-brand-600/40 bg-brand-50 text-brand-700 tracking-wide">
                D3 — MERCADO
              </th>
              <th colSpan={2} className="px-2 py-1.5 border-b border-l-4 border-l-purple-300 bg-purple-50 text-purple-800 tracking-wide">
                D6 — ESTUDIANTIL
              </th>
            </tr>
            <tr className="text-xs text-center text-slate-500 bg-slate-50">
              <th className="px-2 py-1 border-b border-slate-200 border-l-4 border-l-red-300 bg-red-50">●</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-red-50 cursor-pointer hover:bg-red-100 select-none" onClick={() => handleSort('d1')}>{`Score${arrow('d1')}`}</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-red-50">IVA</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-red-50">BES</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-red-50">VAC</th>
              <th className="px-2 py-1 border-b border-slate-200 border-l-4 border-l-emerald-300 bg-emerald-50">●</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-emerald-50 cursor-pointer hover:bg-emerald-100 select-none" onClick={() => handleSort('d2')}>{`Score${arrow('d2')}`}</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-emerald-50">IOE</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-emerald-50">IHE</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-emerald-50">IEA</th>
              <th className="px-2 py-1 border-b border-slate-200 border-l-4 border-l-brand-600/40 bg-brand-50">●</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-brand-50 cursor-pointer hover:bg-brand-100 select-none" onClick={() => handleSort('d3')}>{`Score${arrow('d3')}`}</th>
              <th className="px-2 py-1 border-b border-slate-200 border-l-4 border-l-purple-300 bg-purple-50">●</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-purple-50 cursor-pointer hover:bg-purple-100 select-none" onClick={() => handleSort('d6')}>{`Score${arrow('d6')}`}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ id, nombre, kpi }) => {
              const d1 = kpi!.d1_obsolescencia
              const d2 = kpi!.d2_oportunidades
              const d3 = kpi!.d3_mercado
              const d6 = kpi!.d6_estudiantil
              return (
                <tr key={id} className="border-b border-slate-100 hover:bg-slate-50 text-center">
                  <td className="px-3 py-2 text-left text-xs font-semibold text-slate-800">
                    <Link href={`/carreras/${id}`} className="hover:text-brand-700 hover:underline">{nombre}</Link>
                  </td>
                  <td className="px-2 py-2 border-l-4 border-l-red-200 bg-red-50/50"><Dot value={d1.score} isD1={true} /></td>
                  <td className="px-2 py-2 bg-red-50/50"><Bar value={d1.score} isD1={true} /></td>
                  <td className="px-2 py-2 bg-red-50/50"><Sub value={d1.iva} isD1={true} /></td>
                  <td className="px-2 py-2 bg-red-50/50"><Sub value={d1.bes} isD1={true} /></td>
                  <td className="px-2 py-2 bg-red-50/50"><Sub value={d1.vac} isD1={true} /></td>
                  <td className="px-2 py-2 border-l-4 border-l-emerald-200 bg-emerald-50/50"><Dot value={d2.score} isD1={false} /></td>
                  <td className="px-2 py-2 bg-emerald-50/50"><Bar value={d2.score} isD1={false} /></td>
                  <td className="px-2 py-2 bg-emerald-50/50"><Sub value={d2.ioe} isD1={false} /></td>
                  <td className="px-2 py-2 bg-emerald-50/50"><Sub value={d2.ihe} isD1={false} /></td>
                  <td className="px-2 py-2 bg-emerald-50/50"><Sub value={d2.iea} isD1={false} /></td>
                  <td className="px-2 py-2 border-l-4 border-l-brand-600/40 bg-brand-50/50"><Dot value={d3.score} isD1={false} /></td>
                  <td className="px-2 py-2 bg-brand-50/50"><Bar value={d3.score} isD1={false} /></td>
                  <td className="px-2 py-2 border-l-4 border-l-purple-200 bg-purple-50/50"><Dot value={d6.score} isD1={false} /></td>
                  <td className="px-2 py-2 bg-purple-50/50"><Bar value={d6.score} isD1={false} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
          <span className="text-red-600">● rojo</span> = alerta ·{' '}
          <span className="text-yellow-600">● amarillo</span> = medio ·{' '}
          <span className="text-emerald-600">● verde</span> = bueno &nbsp;(D1: alto=malo · D2: alto=bueno)
        </p>
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {loadingMore ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400 text-center">
        {sorted.length} carreras · ordenado por {sortKey.toUpperCase()}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE && git add frontend/src/app/kpis/page.tsx frontend/src/components/KpisTable.tsx && git commit -m "feat(p4): /kpis tabs con brand color + KpisTable paleta slate/emerald"
```

---

## Task 7: /carreras/[id] — Layout 2 Columnas

**Files:**
- Modify: `frontend/src/app/carreras/[id]/page.tsx`

Cambios: `max-w-2xl` → `max-w-4xl`, grid 2 columnas (KPI bars + semáforo), FanChart más grande (`h-96`), semáforo usa `ui/Badge`, secciones en `ui/Card`.

- [ ] **Step 1: Reemplazar /carreras/[id]/page.tsx**

```tsx
// frontend/src/app/carreras/[id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCarreraDetalle, getKpisHistorico } from '@/lib/api'
import type { CarreraDetalle, HistoricoSerie } from '@/lib/types'
import FanChart from '@/components/FanChart'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type ScoreKey = 'd1_obsolescencia' | 'd2_oportunidades' | 'd3_mercado' | 'd6_estudiantil'

interface PredData {
  predicciones: Record<string, {
    fecha_prediccion: string
    valor_predicho: number
    ci_80_lower: number | null
    ci_80_upper: number | null
    ci_95_lower: number | null
    ci_95_upper: number | null
  }[]>
}

interface SemaforoEntry {
  color: string
  valor_predicho: number | null
}

type SemaforoData = Record<string, SemaforoEntry>

const KPI_META: { key: ScoreKey; label: string; invert: boolean }[] = [
  { key: 'd1_obsolescencia', label: 'D1 Obsolescencia', invert: true },
  { key: 'd2_oportunidades', label: 'D2 Oportunidades', invert: false },
  { key: 'd3_mercado', label: 'D3 Mercado Laboral', invert: false },
  { key: 'd6_estudiantil', label: 'D6 Perfil Estudiantil', invert: false },
]

function ScoreBar({ label, score, invert }: { label: string; score: number; invert: boolean }) {
  const bad = invert ? score >= 0.6 : score < 0.4
  const ok = invert ? score < 0.4 : score >= 0.6
  const barColor = ok ? 'bg-emerald-500' : bad ? 'bg-red-500' : 'bg-yellow-400'
  const textColor = ok ? 'text-emerald-700' : bad ? 'text-red-700' : 'text-yellow-700'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className={`text-sm font-bold font-mono ${textColor}`}>{score.toFixed(3)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score * 100}%` }} />
      </div>
    </div>
  )
}

function MiniLineChart({ d1, d2 }: { d1: HistoricoSerie; d2: HistoricoSerie }) {
  const points = d1.serie
  if (points.length < 2) return <p className="text-xs text-slate-400 py-4 text-center">Sin datos históricos suficientes.</p>
  const W = 400, H = 80, PAD = 8
  const allVals = [...d1.serie.map(p => p.valor), ...d2.serie.map(p => p.valor)]
  const minV = Math.min(...allVals, 0), maxV = Math.max(...allVals, 1)
  const xOf = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const yOf = (v: number) => H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD * 2)
  const toPath = (serie: HistoricoSerie) =>
    serie.serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(p.valor)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      <path d={toPath(d1)} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={toPath(d2)} fill="none" stroke="#4f46e5" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const SEMAFORO_VARIANT: Record<string, 'risk' | 'oportunidad' | 'neutro'> = {
  rojo: 'risk',
  verde: 'oportunidad',
  amarillo: 'neutro',
  sin_datos: 'neutro',
}

export default function CarreraDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [detalle, setDetalle] = useState<CarreraDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [histD1, setHistD1] = useState<HistoricoSerie | null>(null)
  const [histD2, setHistD2] = useState<HistoricoSerie | null>(null)
  const [predData, setPredData] = useState<PredData | null>(null)
  const [semaforoRes, setSemaforoRes] = useState<SemaforoData | null>(null)

  useEffect(() => {
    if (!id) return
    getCarreraDetalle(id)
      .then(setDetalle)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    getKpisHistorico(id, 'd1_score', 30).then(setHistD1).catch(() => {})
    getKpisHistorico(id, 'd2_score', 30).then(setHistD2).catch(() => {})
    fetch(`${BASE}/predicciones/carrera/${id}?kpi=D1`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPredData(data) })
      .catch(() => {})
    fetch(`${BASE}/predicciones/carrera/${id}/semaforo`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSemaforoRes(data) })
      .catch(() => {})
  }, [id])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm mb-4">Carrera no encontrada.</p>
        <Link href="/kpis" className="text-brand-600 text-sm hover:underline">← Ver KPIs</Link>
      </div>
    )
  }

  const d = detalle!

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb + título */}
      <div className="mb-6">
        <Link href="/carreras" className="text-xs text-brand-600 hover:underline">← Carreras</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{d.nombre}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          {d.area_conocimiento && <Badge variant="default">{d.area_conocimiento}</Badge>}
          {d.nivel && <Badge variant="neutro">{d.nivel}</Badge>}
          {d.duracion_anios && <Badge variant="neutro">{d.duracion_anios} años</Badge>}
        </div>
      </div>

      {/* Layout 2 columnas: KPIs izquierda (2/3) + Semáforo derecha (1/3) */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* KPI bars — 2/3 */}
        {d.kpi && (
          <Card className="col-span-2 p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-4">Indicadores KPI</h2>
            <div className="space-y-4">
              {KPI_META.map(({ key, label, invert }) => (
                <ScoreBar key={key} label={label} score={d.kpi![key].score} invert={invert} />
              ))}
            </div>
          </Card>
        )}

        {/* Semáforo Predictivo — 1/3 */}
        {semaforoRes && (
          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-4">Proyección D1</h2>
            <div className="space-y-3">
              {([['1_año', '1 año'], ['3_años', '3 años'], ['5_años', '5 años']] as [string, string][]).map(([key, label]) => {
                const s = semaforoRes[key]
                const colorKey = s?.color ?? 'sin_datos'
                const variant = SEMAFORO_VARIANT[colorKey] ?? 'neutro'
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <div className="flex items-center gap-2">
                      {s?.valor_predicho != null && (
                        <span className="text-xs font-mono text-slate-500">D1 = {s.valor_predicho.toFixed(2)}</span>
                      )}
                      <Badge variant={variant}>{colorKey}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Tendencia histórica */}
      {histD1 && histD2 && (
        <Card className="mb-6 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Tendencia histórica</h2>
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-red-500"></span>D1 Obsolescencia</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-brand-600"></span>D2 Oportunidades</span>
            </div>
          </div>
          <MiniLineChart d1={histD1} d2={histD2} />
        </Card>
      )}

      {/* Fan Chart D1 */}
      {predData?.predicciones?.D1 && predData.predicciones.D1.length > 0 && (
        <Card className="mb-6 p-5">
          <FanChart
            historico={[]}
            predicciones={predData.predicciones.D1}
            kpiNombre="D1"
            titulo="Proyección D1 — Riesgo de Obsolescencia (3 años)"
          />
        </Card>
      )}

      {/* IES que ofrecen la carrera */}
      {d.instituciones.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 text-sm">
              Ofrecida por {d.instituciones.length} institución{d.instituciones.length !== 1 ? 'es' : ''}
            </h2>
          </div>
          {d.instituciones.map(inst => (
            <div key={inst.ies_id} className="px-5 py-3 border-b border-slate-100 last:border-0 flex items-center justify-between">
              <div>
                <Link href={`/ies/${inst.ies_id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  {inst.ies_nombre}
                </Link>
                {inst.ciclo && <p className="text-xs text-slate-400">{inst.ciclo}</p>}
              </div>
              {inst.matricula != null && (
                <span className="text-xs text-slate-500">{inst.matricula.toLocaleString()} estudiantes</span>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Commit final**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE && git add frontend/src/app/carreras/ && git commit -m "feat(p4): /carreras/[id] layout 2 columnas — KPIs + semáforo + FanChart en Card"
```

---

## Verificación Final

- [ ] **Correr TypeScript en frío**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Expected: 0 errores en todos los archivos modificados.

- [ ] **Correr backend tests (sin cambios en backend)**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 334 passed.
