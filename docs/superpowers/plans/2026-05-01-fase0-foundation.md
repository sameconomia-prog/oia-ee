# Fase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar la infraestructura base de la landing (route groups, tokens CSS, fuentes, 6 componentes de animación) sin romper el dashboard existente (P117–P203).

**Architecture:** Route groups `(landing)` y `(dashboard)` reemplazan el hack de pathname en el root layout. El `(landing)/layout.tsx` monta LenisProvider + GSAPProvider + NoiseOverlay + CustomCursor + PageLoader; el `(dashboard)/layout.tsx` conserva Sidebar + WhiteLabelApplier + BusquedaGlobal. Tokens CSS namespaceados en `.landing-theme {}` para no interferir con variables oklch del dashboard.

**Tech Stack:** Next.js 14 App Router, GSAP (free — incluye SplitText + CustomEase), Lenis, TypeScript, Tailwind CSS.

---

## Mapa de archivos

### Crear
```
frontend/src/app/(landing)/layout.tsx
frontend/src/app/(dashboard)/layout.tsx
frontend/src/components/landing/providers/GSAPProvider.tsx
frontend/src/components/landing/providers/LenisProvider.tsx
frontend/src/components/landing/ui/NoiseOverlay.tsx
frontend/src/components/landing/ui/CustomCursor.tsx
frontend/src/components/landing/ui/PageLoader.tsx
frontend/src/components/landing/ui/GridDecorative.tsx
frontend/src/components/landing/ui/HeroGradientFallback.tsx
```

### Modificar
```
frontend/src/app/layout.tsx           ← volverlo minimal (solo HTML shell + metadata)
frontend/src/app/globals.css          ← agregar tokens .landing-theme { ... }
```

### Mover (git mv — URL no cambia)
```
app/page.tsx              → app/(landing)/page.tsx
app/investigaciones/      → app/(landing)/investigaciones/
app/planes/               → app/(landing)/planes/
app/pertinencia/          → app/(landing)/pertinencia/
app/admin/                → app/(dashboard)/admin/
app/benchmarks/           → app/(dashboard)/benchmarks/
app/carreras/             → app/(dashboard)/carreras/
app/comparar/             → app/(dashboard)/comparar/
app/comparativo-global/   → app/(dashboard)/comparativo-global/
app/estadisticas/         → app/(dashboard)/estadisticas/
app/guia/                 → app/(dashboard)/guia/
app/ies/                  → app/(dashboard)/ies/
app/impacto/              → app/(dashboard)/impacto/
app/kpis/                 → app/(dashboard)/kpis/
app/login/                → app/(dashboard)/login/
app/metodologia/          → app/(dashboard)/metodologia/
app/noticias/             → app/(dashboard)/noticias/
app/ranking-ies/          → app/(dashboard)/ranking-ies/
app/recomienda/           → app/(dashboard)/recomienda/
app/rector/               → app/(dashboard)/rector/
app/simulador/            → app/(dashboard)/simulador/
app/skills/               → app/(dashboard)/skills/
app/solicitar-demo/       → app/(dashboard)/solicitar-demo/
app/tendencias/           → app/(dashboard)/tendencias/
app/vacantes/             → app/(dashboard)/vacantes/
```

### Quedan en root (no mover)
```
app/api/          ← Next.js API routes (siempre en root)
app/embed/        ← ya en (public)/ group, no tocar
app/(public)/     ← no tocar
app/robots.ts     ← special Next.js file
app/sitemap.ts    ← special Next.js file
app/error.tsx     ← global error boundary
app/not-found.tsx ← global 404
```

---

## Task 1: Instalar dependencias

**Files:**
- Modify: `frontend/package.json` (automático vía npm)

- [ ] **Step 1: Instalar paquetes**

```bash
cd ~/Documents/OIA-EE/frontend
npm install gsap @gsap/react lenis @react-three/fiber @react-three/drei three
```

- [ ] **Step 2: Verificar que gsap incluyó todos los plugins**

```bash
ls node_modules/gsap/dist/ | grep -E "SplitText|CustomEase|ScrollTrigger"
```

Esperado (debe aparecer): `SplitText.js`, `CustomEase.js`, `ScrollTrigger.js`

- [ ] **Step 3: Verificar tipos Three.js**

```bash
ls node_modules/@types/ | grep three || echo "tipos incluidos en three"
```

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/OIA-EE/frontend
git add package.json package-lock.json
git commit -m "chore: install gsap lenis r3f drei three for landing redesign"
```

---

## Task 2: Agregar tokens CSS al globals.css

**Files:**
- Modify: `frontend/src/app/globals.css`

No tocar las variables oklch existentes del dashboard. Los nuevos tokens van en un selector `.landing-theme {}` que se aplica solo al `<html>` del `(landing)/layout.tsx`.

- [ ] **Step 1: Agregar bloque de tokens al final de globals.css**

Abrir `frontend/src/app/globals.css` y agregar al final:

```css
/* ============================================
   LANDING THEME — dark navy, sin interferencia
   con dashboard variables
   ============================================ */

.landing-theme {
  /* Fondos — 5 niveles */
  --l-bg-0: #08090a;
  --l-bg-1: #0f1011;
  --l-bg-2: #141516;
  --l-bg-3: #191a1b;
  --l-bg-4: #232326;

  /* Texto — grises azulados */
  --l-text-primary:   #f7f8f8;
  --l-text-secondary: #cad5e2;
  --l-text-tertiary:  #90a1b9;
  --l-text-muted:     #62748e;

  /* Accent & Status */
  --l-accent:  #3B82F6;
  --l-alert:   #F59E0B;
  --l-danger:  #EF4444;
  --l-success: #10B981;

  /* Glow doble capa */
  --l-glow: 0 0 20px #3b82f630, 0 0 60px #3b82f614;

  /* Borders translúcidos — nunca color sólido */
  --l-border-subtle: rgba(255, 255, 255, 0.06);
  --l-border-mid:    rgba(255, 255, 255, 0.10);
  --l-border-strong: rgba(255, 255, 255, 0.12);

  /* Tipografía fluida */
  --l-text-display: clamp(3rem, 7vw, 5.5rem);
  --l-text-hero:    clamp(2.5rem, 5vw, 4rem);
  --l-text-h2:      clamp(1.75rem, 3vw, 2.5rem);
  --l-text-h3:      clamp(1.25rem, 2vw, 1.75rem);

  /* Grid decorativo */
  --l-grid-size: 64px;
  --l-grid-color: rgba(59, 130, 246, 0.03);
}
```

- [ ] **Step 2: TypeScript check (no aplica a CSS, pero verificar que globals.css no rompió build)**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -20
```

Esperado: sin errores relacionados a CSS.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(landing): design tokens namespaced en .landing-theme"
```

---

## Task 3: Crear GSAPProvider

**Files:**
- Create: `frontend/src/components/landing/providers/GSAPProvider.tsx`

- [ ] **Step 1: Crear el directorio**

```bash
mkdir -p ~/Documents/OIA-EE/frontend/src/components/landing/providers
```

- [ ] **Step 2: Crear GSAPProvider.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'

export default function GSAPProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase)

    CustomEase.create('cinematicSilk',   '0.45,0.05,0.55,0.95')
    CustomEase.create('cinematicSmooth', '0.25,0.1,0.25,1')
    CustomEase.create('cinematicFlow',   '0.33,0,0.2,1')

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      gsap.defaults({ duration: 0.01 })
      ScrollTrigger.getAll().forEach(t => t.kill())
    }

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  return <>{children}</>
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

Esperado: 0 errores en `GSAPProvider.tsx`. Si GSAP types no están incluidos: `npm install --save-dev @types/gsap` (aunque gsap@3.x incluye types propios).

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/providers/GSAPProvider.tsx
git commit -m "feat(landing): GSAPProvider con ScrollTrigger, SplitText, CustomEase y reduced-motion"
```

---

## Task 4: Crear LenisProvider

**Files:**
- Create: `frontend/src/components/landing/providers/LenisProvider.tsx`

- [ ] **Step 1: Crear LenisProvider.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    if (!isDesktop) return

    const lenis = new Lenis({ lerp: 0.08, syncTouch: false })

    const ticker = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(ticker)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/providers/LenisProvider.tsx
git commit -m "feat(landing): LenisProvider desktop-only, lerp 0.08, GSAP ticker sync"
```

---

## Task 5: Crear NoiseOverlay

**Files:**
- Create: `frontend/src/components/landing/ui/NoiseOverlay.tsx`

El componente genera la textura noise via Canvas API en el cliente (sin PNG externo) y la convierte en data URL para usar como background-image.

- [ ] **Step 1: Crear el directorio**

```bash
mkdir -p ~/Documents/OIA-EE/frontend/src/components/landing/ui
```

- [ ] **Step 2: Crear NoiseOverlay.tsx**

```tsx
'use client'

import { useEffect, useRef } from 'react'

function generateNoiseDataURL(size = 256): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = Math.random() * 255
    imageData.data[i]     = value
    imageData.data[i + 1] = value
    imageData.data[i + 2] = value
    imageData.data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

export default function NoiseOverlay() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const dataURL = generateNoiseDataURL(256)
    ref.current.style.backgroundImage = `url(${dataURL})`
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
        opacity: 0.015,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/ui/NoiseOverlay.tsx
git commit -m "feat(landing): NoiseOverlay generado via Canvas API, opacity 0.015"
```

---

## Task 6: Crear CustomCursor

**Files:**
- Create: `frontend/src/components/landing/ui/CustomCursor.tsx`

- [ ] **Step 1: Crear CustomCursor.tsx**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const TRAIL_COUNT = 5

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const trailRefs = useRef<HTMLDivElement[]>([])
  const mouse = useRef({ x: 0, y: 0 })
  const isVisible = useRef(false)

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || window.innerWidth < 1024
    if (isTouch) return

    const cursor = cursorRef.current
    if (!cursor) return

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }

      if (!isVisible.current) {
        isVisible.current = true
        gsap.to(cursor, { opacity: 1, duration: 0.3 })
        trailRefs.current.forEach(t => gsap.to(t, { opacity: 0.3, duration: 0.3 }))
      }

      gsap.to(cursor, {
        x: e.clientX - 6,
        y: e.clientY - 6,
        duration: 0.15,
        ease: 'power2.out',
      })

      trailRefs.current.forEach((dot, i) => {
        gsap.to(dot, {
          x: e.clientX - 3,
          y: e.clientY - 3,
          duration: 0.15 + i * 0.04,
          ease: 'power2.out',
          delay: i * 0.02,
        })
      })
    }

    const onEnterHoverable = () => {
      gsap.to(cursor, { width: 40, height: 40, x: '-=14', y: '-=14', duration: 0.25, ease: 'power2.out' })
    }

    const onLeaveHoverable = () => {
      gsap.to(cursor, { width: 12, height: 12, x: '+=14', y: '+=14', duration: 0.25, ease: 'power2.out' })
    }

    const attachHoverListeners = () => {
      document.querySelectorAll('a, button, [data-cursor-hover]').forEach(el => {
        el.addEventListener('mouseenter', onEnterHoverable)
        el.addEventListener('mouseleave', onLeaveHoverable)
      })
    }

    document.addEventListener('mousemove', onMove)
    attachHoverListeners()

    return () => {
      document.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <>
      <div
        ref={cursorRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'white',
          mixBlendMode: 'difference',
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: 0,
          transform: 'translate(-100px, -100px)',
        }}
      />
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={el => { if (el) trailRefs.current[i] = el }}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'white',
            mixBlendMode: 'difference',
            pointerEvents: 'none',
            zIndex: 99998,
            opacity: 0,
            transform: 'translate(-100px, -100px)',
          }}
        />
      ))}
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ui/CustomCursor.tsx
git commit -m "feat(landing): CustomCursor desktop-only, 12px→40px hover, 5-dot trail GSAP"
```

---

## Task 7: Crear PageLoader

**Files:**
- Create: `frontend/src/components/landing/ui/PageLoader.tsx`

- [ ] **Step 1: Crear PageLoader.tsx**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

export default function PageLoader() {
  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const alreadyVisited = sessionStorage.getItem('oia-visited')
    if (alreadyVisited) return

    setVisible(true)

    const minDelay = new Promise<void>(resolve => setTimeout(resolve, 1500))
    const domReady = new Promise<void>(resolve => {
      if (document.readyState === 'complete') resolve()
      else window.addEventListener('load', () => resolve(), { once: true })
    })

    Promise.all([minDelay, domReady]).then(() => {
      sessionStorage.setItem('oia-visited', '1')
      if (!overlayRef.current) return
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => setVisible(false),
      })
    })
  }, [])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#08090a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        gap: '1.5rem',
      }}
    >
      {/* Logo OIA-EE — pulse */}
      <div
        style={{
          fontFamily: 'var(--font-syne, sans-serif)',
          fontSize: '2rem',
          fontWeight: 700,
          color: '#f7f8f8',
          letterSpacing: '-0.03em',
          animation: 'oiaPulse 1.4s ease-in-out infinite',
        }}
      >
        OIA<span style={{ color: '#3B82F6' }}>—</span>EE
      </div>
      <p
        style={{
          fontFamily: 'var(--font-outfit, sans-serif)',
          fontSize: '0.8rem',
          color: '#62748e',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Cargando datos...
      </p>
      <style>{`
        @keyframes oiaPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ui/PageLoader.tsx
git commit -m "feat(landing): PageLoader cold-start only via sessionStorage, mínimo 1.5s"
```

---

## Task 8: Crear GridDecorative

**Files:**
- Create: `frontend/src/components/landing/ui/GridDecorative.tsx`

- [ ] **Step 1: Crear GridDecorative.tsx**

```tsx
export default function GridDecorative() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(var(--l-grid-color, rgba(59,130,246,0.03)) 1px, transparent 1px),
          linear-gradient(90deg, var(--l-grid-color, rgba(59,130,246,0.03)) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
        pointerEvents: 'none',
        display: 'none',
      }}
      className="lg:block"
    />
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ui/GridDecorative.tsx
git commit -m "feat(landing): GridDecorative CSS-only 64px grid, solo desktop"
```

---

## Task 9: Crear HeroGradientFallback

**Files:**
- Create: `frontend/src/components/landing/ui/HeroGradientFallback.tsx`

Este componente es el LCP real para mobile (Three.js canvas solo se carga en desktop).

- [ ] **Step 1: Crear HeroGradientFallback.tsx**

```tsx
export default function HeroGradientFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 70%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(30,58,138,0.08) 0%, transparent 60%),
          #08090a
        `,
        animation: 'heroGradientShift 8s ease-in-out infinite alternate',
      }}
    >
      <style>{`
        @keyframes heroGradientShift {
          from { opacity: 1; }
          to   { opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ui/HeroGradientFallback.tsx
git commit -m "feat(landing): HeroGradientFallback mobile LCP — gradiente CSS animado"
```

---

## Task 10: Crear (landing)/layout.tsx

**Files:**
- Create: `frontend/src/app/(landing)/layout.tsx`

Este layout monta las fuentes nuevas, aplica `.landing-theme` al `<html>`, y envuelve los providers.

- [ ] **Step 1: Crear directorio**

```bash
mkdir -p ~/Documents/OIA-EE/frontend/src/app/\(landing\)
```

- [ ] **Step 2: Crear (landing)/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Instrument_Serif, Syne, Outfit, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import GSAPProvider from '@/components/landing/providers/GSAPProvider'
import LenisProvider from '@/components/landing/providers/LenisProvider'
import NoiseOverlay from '@/components/landing/ui/NoiseOverlay'
import CustomCursor from '@/components/landing/ui/CustomCursor'
import PageLoader from '@/components/landing/ui/PageLoader'

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-serif',
})

const syne = Syne({
  weight: ['700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
})

const outfit = Outfit({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'OIA-EE — Observatorio IA · Empleo · Educación',
    template: '%s | OIA-EE',
  },
  description: 'Monitoreo en tiempo real del impacto de la IA en educación y empleo en México. Rankings D1–D7, comparación IES, alertas y tendencias.',
  openGraph: {
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: 'Rankings D1–D7 de carreras por riesgo de automatización. Datos abiertos sobre IES en México.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'OIA-EE',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`landing-theme ${instrumentSerif.variable} ${syne.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body style={{ background: 'var(--l-bg-0)', color: 'var(--l-text-primary)', margin: 0 }}>
        <GSAPProvider>
          <LenisProvider>
            <PageLoader />
            <NoiseOverlay />
            <CustomCursor />
            {children}
            <Analytics />
          </LenisProvider>
        </GSAPProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(landing\)/layout.tsx
git commit -m "feat(landing): layout con fuentes, .landing-theme, GSAPProvider, LenisProvider, infra components"
```

---

## Task 11: Crear (dashboard)/layout.tsx

**Files:**
- Create: `frontend/src/app/(dashboard)/layout.tsx`

Extrae la lógica del dashboard del root layout actual.

- [ ] **Step 1: Crear directorio**

```bash
mkdir -p ~/Documents/OIA-EE/frontend/src/app/\(dashboard\)
```

- [ ] **Step 2: Crear (dashboard)/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Analytics } from '@vercel/analytics/next'
import Sidebar from '@/components/Sidebar'
import WhiteLabelApplier from '@/components/WhiteLabelApplier'
import BusquedaGlobal from '@/components/BusquedaGlobal'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: {
    default: 'OIA-EE — Plataforma',
    template: '%s | OIA-EE',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn('font-sans', GeistSans.variable)}>
      <body className="flex min-h-screen bg-slate-50 font-sans">
        <WhiteLabelApplier />
        <BusquedaGlobal />
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
        <Analytics />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx
git commit -m "feat(dashboard): layout route group — extrae lógica Sidebar/WhiteLabel del root"
```

---

## Task 12: Simplificar root layout.tsx

El root layout ahora solo maneja rutas que no están en ningún route group (api, embed, robots, sitemap). Como Next.js requiere exactamente UN layout raíz que envuelva todo, este layout debe ser mínimo — solo el shell HTML. Los metadatos globales se mueven al `(landing)/layout.tsx` y `(dashboard)/layout.tsx`.

**IMPORTANTE:** En Next.js App Router, los route groups NO eliminan la necesidad del root layout. El root layout se aplica a TODAS las rutas. Pero si tenemos `<html>` en el root layout Y en los route group layouts → conflicto. La solución correcta: el root layout NO renderiza `<html>/<body>` — eso lo hace cada route group layout.

Sin embargo, Next.js 14 requiere que el root `layout.tsx` exporte `<html>` y `<body>`. La solución real es **no duplicar** `<html>/<body>` en los route group layouts — solo el root los provee.

**Arquitectura correcta:**
- `app/layout.tsx` → `<html><body>` con todo lo mínimo necesario
- `app/(landing)/layout.tsx` → solo un `<div>` wrapper + providers (SIN `<html><body>`)
- `app/(dashboard)/layout.tsx` → solo `<>` wrapper (SIN `<html><body>`)

- [ ] **Step 1: Reescribir root layout.tsx — minimal con soporte dual-font**

```tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Instrument_Serif, Syne, Outfit, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { cn } from '@/lib/utils'

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-serif',
})
const syne = Syne({
  weight: ['700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
})
const outfit = Outfit({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})
const jetbrainsMono = JetBrains_Mono({
  weight: ['500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'OIA-EE — Observatorio IA · Empleo · Educación',
    template: '%s | OIA-EE',
  },
  description: 'Monitoreo en tiempo real del impacto de la IA en educación y empleo en México.',
  keywords: ['IA', 'educación', 'empleo', 'México', 'KPIs', 'observatorio'],
  openGraph: {
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: 'Rankings D1–D7 de carreras por riesgo de automatización.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'OIA-EE',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: '312 IES analizadas. 847 carreras monitoreadas.',
    creator: '@oiaee_mx',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={cn(
        GeistSans.variable,
        instrumentSerif.variable,
        syne.variable,
        outfit.variable,
        jetbrainsMono.variable
      )}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Actualizar (landing)/layout.tsx — SIN html/body (los provee el root)**

Reescribir `frontend/src/app/(landing)/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import GSAPProvider from '@/components/landing/providers/GSAPProvider'
import LenisProvider from '@/components/landing/providers/LenisProvider'
import NoiseOverlay from '@/components/landing/ui/NoiseOverlay'
import CustomCursor from '@/components/landing/ui/CustomCursor'
import PageLoader from '@/components/landing/ui/PageLoader'

export const metadata: Metadata = {
  openGraph: {
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: 'Rankings D1–D7 de carreras por riesgo de automatización.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'OIA-EE',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-theme" style={{ background: 'var(--l-bg-0)', color: 'var(--l-text-primary)', minHeight: '100vh' }}>
      <GSAPProvider>
        <LenisProvider>
          <PageLoader />
          <NoiseOverlay />
          <CustomCursor />
          {children}
        </LenisProvider>
      </GSAPProvider>
    </div>
  )
}
```

- [ ] **Step 3: Actualizar (dashboard)/layout.tsx — SIN html/body**

Reescribir `frontend/src/app/(dashboard)/layout.tsx`:

```tsx
import Sidebar from '@/components/Sidebar'
import WhiteLabelApplier from '@/components/WhiteLabelApplier'
import BusquedaGlobal from '@/components/BusquedaGlobal'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <WhiteLabelApplier />
      <BusquedaGlobal />
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -40
```

Esperado: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/\(landing\)/layout.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "refactor: root layout minimal, route group layouts sin html/body duplicado"
```

---

## Task 13: Migrar páginas al route group correcto

**Files:** Movimientos de filesystem

- [ ] **Step 1: Mover páginas landing**

```bash
cd ~/Documents/OIA-EE/frontend/src/app

git mv page.tsx \(landing\)/page.tsx
git mv investigaciones \(landing\)/investigaciones
git mv planes \(landing\)/planes
git mv pertinencia \(landing\)/pertinencia
```

- [ ] **Step 2: Mover páginas dashboard**

```bash
cd ~/Documents/OIA-EE/frontend/src/app

git mv admin \(dashboard\)/admin
git mv benchmarks \(dashboard\)/benchmarks
git mv carreras \(dashboard\)/carreras
git mv comparar \(dashboard\)/comparar
git mv comparativo-global \(dashboard\)/comparativo-global
git mv estadisticas \(dashboard\)/estadisticas
git mv guia \(dashboard\)/guia
git mv ies \(dashboard\)/ies
git mv impacto \(dashboard\)/impacto
git mv kpis \(dashboard\)/kpis
git mv login \(dashboard\)/login
git mv metodologia \(dashboard\)/metodologia
git mv noticias \(dashboard\)/noticias
git mv ranking-ies \(dashboard\)/ranking-ies
git mv recomienda \(dashboard\)/recomienda
git mv rector \(dashboard\)/rector
git mv simulador \(dashboard\)/simulador
git mv skills \(dashboard\)/skills
git mv solicitar-demo \(dashboard\)/solicitar-demo
git mv tendencias \(dashboard\)/tendencias
git mv vacantes \(dashboard\)/vacantes
```

- [ ] **Step 3: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | head -50
```

Si hay errores de importación (`@/components/...`), son alias — no rutas absolutas, deben seguir funcionando. Si hay errores de tipos en páginas movidas, revisarlos uno por uno.

- [ ] **Step 4: Build check**

```bash
cd ~/Documents/OIA-EE/frontend && npm run build 2>&1 | tail -20
```

Esperado: build exitoso. Si alguna página falla por importaciones rotas, investigar antes de continuar.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/OIA-EE/frontend
git add -A
git commit -m "refactor: migrar páginas a route groups (landing) y (dashboard)"
```

---

## Task 14: Verificación final

- [ ] **Step 1: TypeScript completo**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 2: Backend tests (no deben romperse)**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q 2>&1 | tail -5
```

Esperado: todos los tests pasan (frontend route groups no afectan al backend).

- [ ] **Step 3: Arrancar dev server**

```bash
cd ~/Documents/OIA-EE/frontend && npm run dev
```

- [ ] **Step 4: Verificar manualmente en browser**

Abrir `http://localhost:3000` y verificar:
- [ ] Background oscuro `#08090a` visible (landing theme)
- [ ] Fuentes Instrument Serif / Syne cargadas (DevTools → Network → Font)
- [ ] NoiseOverlay visible (sutil) con DevTools → Elements → `div[aria-hidden]` tiene `backgroundImage`
- [ ] CustomCursor aparece al mover mouse (desktop)
- [ ] PageLoader aparece en primera carga, desaparece tras ~1.5s, no reaparece en F5 (sessionStorage `oia-visited=1`)
- [ ] Navegar a `/carreras` → debe mostrar layout dashboard (fondo blanco, Sidebar)
- [ ] Navegar a `/investigaciones` → debe mostrar layout landing (fondo oscuro)

- [ ] **Step 5: Commit final si hay ajustes**

```bash
cd ~/Documents/OIA-EE
git add -A
git commit -m "feat(fase0): foundation completa — route groups, tokens, fuentes, 6 componentes infra"
```

---

## Self-Review: Cobertura del Spec

| Sección spec | Task que lo cubre |
|---|---|
| Route groups (landing)/(dashboard) | Task 13 |
| Dependencias: gsap, lenis, r3f, drei, three | Task 1 |
| Design tokens globals.css namespaced | Task 2 |
| Tipografía 4 fuentes, 5 weights, clamp() | Task 10 (root layout) |
| LenisProvider lerp 0.08, desktop only | Task 4 |
| GSAPProvider plugins + 3 CustomEase + reduced-motion | Task 3 |
| NoiseOverlay Canvas API | Task 5 |
| CustomCursor desktop-only, trail 5 dots | Task 6 |
| PageLoader cold-start sessionStorage | Task 7 |
| GridDecorative CSS puro | Task 8 |
| HeroGradientFallback mobile LCP | Task 9 |
| Performance budget — verificación | Task 14 |
| Decisión font weights (5 total) | Task 10/12 |
| Decisión mobile (Lenis off <1024px) | Task 4 |
| Decisión PageLoader cold-start | Task 7 |

**Todos los requisitos de Fase 0 cubiertos.** Las Fases 1-5 se planifican por separado tras confirmar que Fase 0 funciona.
