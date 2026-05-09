# Prompt — Animaciones de partículas (prototype-infracorp)

> Spec extraído de `frontend/public/prototype-infracorp.html` para usar como prompt de diseño/migración.

---

## Prompt

Construye un sistema cinematográfico de partículas en **Three.js r128** que actúa como narrativa visual sincronizada con el scroll de una landing page de cinco secciones. La página es un dark-theme premium (fondo `#0a0a0a`, acento cuero `#c5a47e`, texto `#f0ede8`) y las partículas viven en un `<canvas>` fijo a pantalla completa por detrás del contenido (`position: fixed; z-index: 0`).

### Tecnología
- **Three.js r128** (CDN, sin bundler), un único `THREE.Points` con `ShaderMaterial` y `THREE.AdditiveBlending`.
- **GSAP 3.12 + ScrollTrigger** (solo para reveals de texto del Hero y otras secciones, NO para morphing — el morph se hace en el `requestAnimationFrame`).
- **WebGLRenderer** con `alpha: true`, `antialias: false`, `setPixelRatio(min(devicePixelRatio, 2))`.
- **Cámara perspectiva** FOV 55, posición `z=3.2`.
- **N = 10,000 partículas** estáticas en un solo `BufferGeometry` con atributos `position`, `aColor`, `aSize`.

### Cinco estados narrativos (uno por sección)

El scroll mapea a un `targetProgress` continuo de 0 a 4. Cada índice corresponde a una **forma generada como Float32Array de N×3**:

| Estado | Sección HTML id | Forma | Significado |
|---|---|---|---|
| 0 | `#hero` | **Face3D** — cabeza humana con birrete (sólido hemisférico + cuello + boca + cejas + 2 ojos circulares + 4 lados del birrete cuadrado) | Graduado universitario |
| 1 | `#el-problema` | **Hourglass** — reloj de arena con cintura estrecha (`wR=0.06`), cono inferior denso (rápido = IA), cono superior disperso (lento = currículum) | Velocidades asimétricas |
| 2 | `#el-observatorio` | **Globe** — esfera achatada (z*0.55) con 5 anillos-hub satelitales, wireframe lat/lon (5 paralelos × 8 meridianos), 17 nodos ecuatoriales, 88 puntos de superficie | 17 carreras + 5 fuentes + 88 skills |
| 3 | `#la-decision` | **Procession** — 5 figuras humanoides con birrete cuadrado, cabeza circular y cuerpo (puntos aleatorios), avanzando en fila con z escalonado y escala decreciente | Cohorte graduada |
| 4 | `#metodologia` | **Nebula** — distribución esférica gaussiana achatada (`r=1.8..2.9`, escalado `0.90, 0.50, 0.35`) | Apertura interpretativa |

**Importante:** las partículas son las MISMAS 10,000 en todos los estados; solo se interpolan sus posiciones. Cada generador escribe en el mismo `Float32Array` en el mismo orden.

### Paleta indexada por orden de generación

Cada generador llena las partículas en un orden específico para que el color sea estable a través de los morphs:

- **Índices 0–8%** (~800 partículas): **WHITE `#f0ede8`** — *key features* (los rasgos identificadores de cada forma: birretes, anillos de ojos, rims del reloj, hubs del globo, etc.)
- **Índices 8–50%** (~4,200): **ACCENT `#c5a47e`** — estructura principal (silueta, wireframes, contornos)
- **Índices 50–90%** (~4,000): **DIM `#7a6248`** (versión más oscura del acento) — relleno volumétrico, fondo, scatter ambiental
- **Índices 90–100%** (~1,000): mezcla `GLOW = lerp(ACCENT, DIM, 0.4)` para halo

Los tamaños de punto (`aSize`) se asignan también en el generador: 0.005–0.008 para detalles WHITE/ACCENT, 0.012–0.020 para relleno DIM.

### Mapeo scroll → progreso

```
sectionBounds = offsetTop de las 5 secciones
Para sección s (entre b[s] y b[s+1]):
  transStart = b[s] + (b[s+1]-b[s]) * 0.55
  Si scrollY < transStart  →  targetProgress = s            (estado pleno)
  Si no                    →  targetProgress = s + (scrollY - transStart) / (b[s+1] - transStart)
```

Es decir: el primer 55% de cada sección **mantiene** el estado; el último 45% **morfa** al siguiente. Esto da tiempo de lectura.

### Loop de animación

```
currentProgress lerp 3.5%  → targetProgress     // smoothing
clamped = clamp(currentProgress, 0, 4-0.001)
sA = floor(clamped); sB = sA+1
rawT = clamped - sA
morphT = ease quadratic in/out(rawT)            // < 0.5: 2t²;  ≥ 0.5: -1+(4-2t)t

Para cada índice i de N*3:
  morphed[i] = SHAPES[sA][i] * (1-morphT) + SHAPES[sB][i] * morphT
  pos[i]     = SHAPES[4][i]  * (1-introEased) + morphed[i] * introEased   // intro blend
```

### Intro (al cargar la página)
1. La geometría arranca con `SHAPES[4]` (Nebula dispersa).
2. A los **900 ms**, `introStarted = true`.
3. `introT` crece +0.008 por frame (≈2.1 s) hasta 1.
4. `introEased` (quadratic in/out) blendea **Nebula → estado actual del scroll** (que al inicio es Face3D).

Resultado: la página abre con una nebulosa flotante que se condensa progresivamente en el rostro graduado.

### Transformaciones por estado (solo desktop > 900px)

Aplicadas al objeto `THREE.Points` (no al BufferGeometry), interpoladas con lerp 4–6%:

| Estado | OFFSET x | EXTRA x | ROTATION y | SCALE |
|---|---|---|---|---|
| 0 Face3D | +0.50 | 0 | -0.45 rad | 1.00 |
| 1 Hourglass | +0.45 | +1.50 | 0 | **1.90** |
| 2 Globe | -0.45 | 0 | +0.30 rad | 0.80 |
| 3 Procession | +0.40 | 0 | -0.10 rad | 0.85 |
| 4 Nebula | 0 | 0 | 0 | 1.00 |

(En mobile ≤900px todos los offsets se anulan y la forma queda centrada.)

### Cámara con sway sutil

```
camera.position.x = sin(time * 0.08) * 0.06 + currentOffsetX
camera.position.y = sin(time * 0.12) * 0.04
camera.lookAt(currentOffsetX, 0, 0)
```

### Shader de vértices — drift orgánico + arena cayendo

Cada partícula tiene siempre un drift micro de:
```
pos.x += sin(time*0.4 + pos.x*2.3 + pos.y*1.7) * 0.012
pos.y += sin(time*0.3 + pos.z*2.1) * 0.010
```

**Efecto especial del Hourglass** (state 1): hay un *uniform* `uSandT` que vale 1 cuando `currentProgress ≈ 1` (decae a 0 fuera, con `1 - |currentProgress - 1| * 3.5`):

- **Cataratas de arena**: las partículas cerca del eje (`axisR < 0.062`) se desplazan verticalmente con `fract(uTime * fallSpeed)` simulando un chorro continuo que cae por la cintura del reloj.
- **Pila de arena que se acumula** (ciclo de 14 s): `uFillLevel` sube de -0.90 a -0.04 (cono inferior se llena), `uDrainLevel` baja de +0.90 a +0.04 (cono superior se vacía); las partículas interiores arriba del fill o abajo del drain se ocultan vía `vAlpha = 0`. Al completarse el ciclo, reset abrupto.

### Shader de fragmentos — point sprites con halo

```
cxy = 2 * gl_PointCoord - 1
r = dot(cxy, cxy)
if (r > 1) discard               // recorte circular
glow = exp(-r * 2.8)             // gaussiana suave
gl_FragColor = vec4(vColor * (0.6 + glow * 0.6), glow * vAlpha)
```

Combinado con `AdditiveBlending` esto produce el halo soft característico que satura las zonas densas y deja los bordes con vidrio brilloso.

### Performance
- 10,000 puntos a 60 fps en MacBook M1 / iPhone 12+. En mobile bajo, considerar `N = 6000`.
- `pos.size` de partícula en pantalla: `aSize * (280 / -mvPos.z)` — ajuste basado en distancia.
- `geometry.attributes.position.needsUpdate = true` cada frame.

### Reactividad
- `resize`: recalcular `renderer.setSize`, `camera.aspect`, `camera.updateProjectionMatrix`, `computeBounds()`.
- `scroll`: pasivo, listener único que actualiza `targetProgress`.

---

## Cómo usar este prompt

1. **Como guía de migración**: portar el sistema de `prototype-infracorp.html` (script vanilla en líneas 747–1330) a un componente React `GlobalParticleSystem.tsx` reutilizando esta especificación.
2. **Como brief de iteración**: si quieres cambiar formas, paleta o tempo, modifica los valores de la tabla y regenera generadores.
3. **Como referencia para otra IA**: pegar este prompt completo a otra sesión Claude/GPT para que reproduzca el sistema desde cero en cualquier stack.

## Mapping a componentes React actuales (branch `experimento-infracorp`)

- `frontend/src/components/landing/GlobalParticleSystem.tsx` ← reemplazar lógica actual
- `frontend/src/components/landing/particle-shapes.ts` ← exportar 5 generadores: `genFace3D, genHourglass, genGlobe, genProcession, genNebula`
- `frontend/src/components/landing/ScrollStory.tsx` ← ya gestiona los 6 acts narrativos; aquí se **simplifica a 5** (alineado con secciones HTML del prototype)
