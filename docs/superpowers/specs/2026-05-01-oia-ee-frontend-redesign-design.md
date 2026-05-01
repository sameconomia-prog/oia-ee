# OIA-EE — Frontend Redesign Premium: Spec de Diseño
**Fecha:** 2026-05-01  
**Estado:** Aprobado — listo para implementation plan  
**Alcance:** Landing pública + infraestructura de animación. Dashboard (producto) sin tocar.

---

## 1. Arquitectura — Route Groups

```
frontend/src/app/
├── (landing)/
│   ├── layout.tsx          ← Lenis + GSAP + dark theme + fuentes nuevas
│   ├── page.tsx            ← Landing page principal (10 secciones)
│   ├── investigaciones/    ← Editorial (migra a (landing))
│   └── planes/             ← Conversión
│   └── pertinencia/        ← Conversión (migra a (landing))
├── (dashboard)/
│   ├── layout.tsx          ← Geist + paleta verde Humanitas (sin tocar)
│   ├── plataforma/ · rector/ · admin/ · simulador/
│   ├── carreras/[id]/      ← Datos densos → permanece en (dashboard)
│   ├── ies/[id]/           ← Datos densos → permanece en (dashboard)
│   ├── comparar/           ← Datos densos → permanece en (dashboard)
│   ├── benchmarks/         ← Datos densos → permanece en (dashboard)
│   ├── estadisticas/       ← Datos densos → permanece en (dashboard)
│   ├── vacantes/           ← Datos densos → permanece en (dashboard)
│   └── noticias/           ← Datos densos → permanece en (dashboard)
└── globals.css             ← tokens namespaced: .landing-* + .dashboard-*
```

**Criterio de clasificación:** páginas de persuasión/editorial → `(landing)`; páginas con KPIs semáforo, charts Recharts, tablas densas → `(dashboard)`. Preserva los Sprints P117–P203 sin reescritura.

---

## 2. Stack de Dependencias Nuevas

```bash
npm install gsap @gsap/react lenis @react-three/fiber @react-three/drei three
```

| Paquete | Versión | Notas |
|---------|---------|-------|
| `gsap` | latest | SplitText + CustomEase + ScrollTrigger incluidos — gratuitos desde Webflow acquisition |
| `@gsap/react` | latest | Hook `useGSAP` con cleanup automático |
| `lenis` | latest | Reemplaza `@studio-freight/lenis` (deprecated) |
| `three` | latest | Cargado lazy vía `dynamic()` |
| `@react-three/fiber` | latest | Lazy |
| `@react-three/drei` | latest | Lazy |

`motion@12` ya instalado — no reinstalar.

---

## 3. Design Tokens — globals.css

### Fondos (5 niveles, patrón linear.app)
```css
:root {
  --bg-0: #08090a;  /* base más profunda */
  --bg-1: #0f1011;
  --bg-2: #141516;
  --bg-3: #191a1b;
  --bg-4: #232326;  /* cards, elevated */
}
```

### Texto (grises azulados, patrón ausdata.ai)
```css
:root {
  --text-primary:   #f7f8f8;
  --text-secondary: #cad5e2;
  --text-tertiary:  #90a1b9;
  --text-muted:     #62748e;
}
```

### Accent & Status
```css
:root {
  --accent:  #3B82F6;
  --alert:   #F59E0B;
  --danger:  #EF4444;
  --success: #10B981;

  /* Glow doble capa */
  --glow-accent: 0 0 20px #3b82f630, 0 0 60px #3b82f614;

  /* Borders — NUNCA color sólido */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-mid:    rgba(255, 255, 255, 0.10);
  --border-strong: rgba(255, 255, 255, 0.12);
}
```

---

## 4. Tipografía — Google Fonts vía next/font

| Fuente | Weights | Uso |
|--------|---------|-----|
| Instrument Serif | 400 | Display, hero, números grandes |
| Syne | 700 | Headings, nav, cards |
| Outfit | 400, 500 | Body, UI text |
| JetBrains Mono | 500 | Datos, KPIs, badges, código |

**5 weights total** (de 11 originales) ≈ 150KB. `display: 'swap'` en todos.

**Escala fluida con `clamp()`:**
```css
--text-display: clamp(3rem, 7vw, 5.5rem);
--text-hero:    clamp(2.5rem, 5vw, 4rem);
--text-h2:      clamp(1.75rem, 3vw, 2.5rem);
--text-h3:      clamp(1.25rem, 2vw, 1.75rem);
```

**Letter-spacing:**
- `>2rem`: `-0.03em`
- `>3.5rem` display: `-0.05em`

---

## 5. Animación — GSAP + Lenis

### Lenis
```ts
// Solo desktop
if (window.matchMedia('(min-width: 1024px)').matches) {
  const lenis = new Lenis({ lerp: 0.08, syncTouch: false })
  // Sync con GSAP ticker
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}
```

### Plugins registrados
```ts
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase)
```

### 3 CustomEase cinematográficos
```ts
CustomEase.create('cinematicSilk',   '0.45,0.05,0.55,0.95')  // cámara, scroll principal
CustomEase.create('cinematicSmooth', '0.25,0.1,0.25,1')       // text fade-in
CustomEase.create('cinematicFlow',   '0.33,0,0.2,1')          // transición sección
```

### Valores de scrub
| Contexto | scrub |
|----------|-------|
| Texto SplitText | `0.8` |
| Parallax | `1` |
| 1:1 preciso | `true` |

### SplitText
- Stagger: `0.02s` por **char** (no por línea)
- Tipo: `"chars,words"` en hero; `"lines"` en subtítulos

### prefers-reduced-motion
`GSAPProvider` detecta globalmente y cortocircuita todos los timelines a fade simple (sin scrub, sin parallax, sin SplitText stagger).

```ts
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReduced) gsap.globalTimeline.timeScale(0) // o animations sin movimiento
```

---

## 6. Three.js / Particle Hero

```ts
const ParticleHero = dynamic(
  () => import('@/components/landing/ParticleHero'),
  { ssr: false, loading: () => <HeroGradientFallback /> }
)
```

- **Desktop (≥1024px):** Canvas Three.js con campo de partículas, synced vía `lenis.on('scroll', ({progress}) => { mesh.rotation.y = progress * Math.PI * 0.3 })`, ratio `0.001`
- **Mobile (<1024px):** `<HeroGradientFallback />` — gradiente CSS animado + capa noise. Ahorra ~150KB JS y batería.
- `HeroGradientFallback` es el LCP real — no el canvas.

---

## 7. Componentes de Infraestructura

### LenisProvider
- `lerp: 0.08`, `syncTouch: false`
- Solo activo en `≥1024px` (matchMedia)
- Integrado con GSAP ticker

### GSAPProvider
- Registra: `ScrollTrigger`, `SplitText`, `CustomEase`
- Define los 3 CustomEase cinematográficos
- Hook global `prefers-reduced-motion`

### NoiseOverlay
- PNG 256×256 tileado
- `position: fixed`, `opacity: 0.015`, `mix-blend-mode: overlay`, `pointer-events: none`
- Generado vía Canvas API (sin asset externo)

### CustomCursor
- Solo desktop: `!('ontouchstart' in window) && window.innerWidth >= 1024`
- 12px circle → 40px en hover
- `mix-blend-mode: difference`
- Trail de 5 puntos
- **Desactivado sobre el canvas hero** (evita conflicto visual con `mix-blend-mode`)

### PageLoader
- **Solo cold-start:** verifica `sessionStorage.getItem('oia-visited')`
- Con flag → skip directo (preserva LCP en navegación interna)
- Sin flag → logo OIA-EE centrado, pulse, "Cargando datos...", mínimo 1.5s, fade out
- Al completar: `sessionStorage.setItem('oia-visited', '1')`

### GridDecorative
- Líneas CSS puras 64×64px, `rgba(59,130,246,0.03)`
- Solo desktop, `background-image` CSS
- `pointer-events: none`, `position: absolute`

---

## 8. Estructura de Secciones — Landing (page.tsx)

Ritmo AIRE→CARGA→AIRE (patrón infracorp.global):

| # | Sección | Height | Ritmo |
|---|---------|--------|-------|
| 1 | Navbar | auto | — |
| 2 | Hero | 100vh | AIRE |
| 3 | Stats Ticker | auto | CARGA |
| 4 | El Problema | auto | AIRE |
| 5 | Pipeline Metodología | 100vh pinned | RUPTURA |
| 6 | Investigaciones | auto | AIRE |
| 7 | Sobre el Analista | auto | AIRE |
| 8 | Contacto / CTA | auto | CARGA |
| 9 | Footer | auto | — |

**Pipeline (sección 5):** Es el momento de ruptura horizontal. Los 3 nodos se revelan con scroll horizontal interno dentro de 100vh pinned (desktop). En mobile: stack vertical, sin pin (evita bug barra Safari iOS). Patrón distill.pub con `position:sticky` en diagrama + texto al lado.

**Stat de choque:** Se mueve DESPUÉS del pipeline — credenciales técnicas primero, impacto emocional después (patrón Anthropic).

---

## 9. Presentación de Datos

### Mapa México SVG
- Base: SimpleMaps + customización programática
- Anotaciones SVG permanentes en 3 estados outlier (no tooltips)
- Paleta divergente: naranja coral `#E5724A` → slate → azul `#3B82F6`

### Charts IVA / Benchmarks
- Dumbbell chart (estado vs. media nacional) — más informativo que barras simples
- Recharts directo (no Tremor), respetando tokens semáforo del CLAUDE.md

### Investigaciones — Layout Editorial
- Bullets ejecutivos arriba (patrón Anthropic)
- Metodología colapsada al final
- Ratio 70/30 texto/visualización

---

## 10. Responsive Strategy

| Breakpoint | Lenis | CustomCursor | Three.js | Pipeline |
|------------|-------|--------------|----------|----------|
| ≥1024px | Activo | Activo | Canvas | Horizontal pinned |
| <1024px | Desactivado | Desactivado | CSS fallback | Stack vertical |

`prefers-reduced-motion: reduce` → animaciones globalmente cortocircuitadas (fade simple únicamente).

---

## 11. Performance Budget

Cada fase cierra con medición Lighthouse antes de mergear:

| Métrica | Target |
|---------|--------|
| LCP | < 2.5s |
| FID/INP | < 100ms |
| CLS | < 0.1 |
| Lighthouse Performance | ≥ 90 |
| JS bundle inicial | < 200KB gzip |
| Fonts | ≤ 150KB (5 weights) |

Three.js lazy: no afecta bundle inicial. PageLoader solo cold-start: no rompe LCP en navegación interna.

---

## 12. Assets Multimedia (a generar por fase)

| Asset | Herramienta | Especificación |
|-------|-------------|----------------|
| Video hero | Higgsfield / RunwayML | Prompt listo en Visual Companion |
| Mockup reporte | ChatGPT / Midjourney | 1200×1600px PNG |
| OG Image | ChatGPT | 1200×630px |
| Noise texture | Canvas API | 256×256 PNG, sin herramienta externa |
| SVG íconos (14) | Código directo | Claude genera en implementación |
| Mapa México SVG | SimpleMaps | Customización programática |

---

## 13. Fases de Implementación

| Fase | Contenido | Depende de |
|------|-----------|------------|
| **Fase 0** | Route groups, tokens CSS, fuentes, LenisProvider, GSAPProvider, 6 componentes infra | — |
| **Fase 1** | Navbar + Hero (Three.js + SplitText) | Fase 0 |
| **Fase 2** | Stats Ticker + El Problema | Fase 0 |
| **Fase 3** | Pipeline + Investigaciones | Fase 0 |
| **Fase 4** | Sobre + Contacto + Footer | Fase 0 |
| **Fase 5** | Performance audit, assets reales, SEO/OG | Fases 1-4 |

Fases 1-4 pueden arrancar en paralelo sobre la base de Fase 0.

---

## Decisiones Registradas

| Decisión | Elegida | Razón |
|----------|---------|-------|
| GSAP Club vs free | **Free (npm público)** | SplitText + CustomEase gratuitos desde Webflow acquisition abril 2024 |
| `@studio-freight/lenis` vs `lenis` | **`lenis`** | paquete oficial, studio-freight deprecated |
| Páginas legacy → route group | Ver tabla sección 1 | Datos densos → dashboard; editorial/conversión → landing |
| Mobile scroll | **Scroll nativo** | Lenis desactivado <1024px; evita jank iOS |
| Three.js mobile | **CSS gradient fallback** | Ahorra ~150KB JS + batería |
| PageLoader | **Cold-start only** | sessionStorage flag; preserva LCP en nav interna |
| Font weights | **5 weights** | Instrument Serif 400, Syne 700, Outfit 400/500, JetBrains Mono 500 |
