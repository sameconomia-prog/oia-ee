// frontend/src/app/pertinencia/page.tsx
'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { getBenchmarkCareers, getTendenciasNacionales } from '@/lib/api'
import type { BenchmarkCareerSummary, TendenciaNacional } from '@/lib/types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const INCLUDES = [
  'Análisis de hasta 3 carreras de tu institución',
  'Diagnóstico D1–D2 con score y semáforo por carrera',
  'Top 5 skills en riesgo y top 5 en oportunidad por carrera',
  'Comparativo vs. promedio nacional',
  'Reporte ejecutivo PDF de 4 páginas por carrera',
  'Sin costo, sin compromisos, sin tarjeta',
]

const ESTUDIO_PROFUNDO = [
  'Análisis de hasta 17 carreras + benchmarks globales',
  'Matriz de convergencia 5 fuentes (WEF, McKinsey, CEPAL, Frey-Osborne, Anthropic)',
  'Diagnóstico D1–D7 completo con plan curricular accionable',
  'Skills clasificadas por acción: retirar / rediseñar / fortalecer / agregar',
  'Reporte ejecutivo PDF de 11 páginas + sesión de presentación',
  'Entregable en 15 días hábiles',
]

const STEPS = [
  { n: '1', label: 'Solicitud', desc: 'Llenas el formulario en 2 minutos' },
  { n: '2', label: 'Revisión', desc: 'OIA-EE confirma en 24 horas hábiles' },
  { n: '3', label: 'Análisis', desc: 'Procesamos datos en 5–7 días hábiles' },
  { n: '4', label: 'Entrega', desc: 'Reporte PDF + sesión de presentación' },
]

const FAQ = [
  {
    q: '¿Diagnóstico Express y Estudio Profundo: cuál es la diferencia?',
    a: 'El Diagnóstico Express es gratuito, cubre hasta 3 carreras, entrega un PDF ejecutivo de 4 páginas por carrera con D1/D2 y top skills. Es la mejor entrada para conocer la metodología y obtener una primera lectura accionable. El Estudio Profundo (MXN $120,000) cubre hasta 17 carreras, incluye D1–D7 completo, matriz de convergencia 5 fuentes, plan curricular por skill y sesión de presentación a consejo. Si tu institución necesita un análisis para Consejo Directivo o rediseño curricular formal, el Profundo es lo apropiado.',
  },
  {
    q: '¿Por qué hay una versión gratuita?',
    a: 'OIA-EE es un observatorio independiente. El Express es nuestra forma de demostrar la metodología sin barrera económica: las IES que pasan por el Express conocen la profundidad real del análisis y deciden si su caso requiere el Estudio Profundo o suscribirse al observatorio.',
  },
  {
    q: '¿Qué necesito proporcionar?',
    a: 'Para Express: nombre de hasta 3 carreras y tu correo institucional. Para Profundo: además, lista de carreras prioritarias, contexto curricular y, si aplica, agenda con el Consejo Académico para la sesión de presentación.',
  },
  {
    q: '¿Cómo sé que el análisis es riguroso?',
    a: 'La metodología cruza 5 fuentes internacionales (WEF Future of Jobs, McKinsey, CEPAL, Frey-Osborne, Anthropic) más datos del mercado laboral mexicano (IMSS, INEGI ENOE, OCC). El Express usa el mismo motor; lo que reduce es la cobertura por carrera y los entregables, no la calidad metodológica. Puedes explorar la metodología en /benchmarks antes de solicitar.',
  },
  {
    q: '¿El estudio habla solo de IA o es curricular en general?',
    a: 'Es específico al impacto de la automatización e IA generativa sobre competencias profesionales. Diagnóstica qué competencias de tu plan de estudios tienen riesgo de obsolescencia (D1), cuáles representan oportunidades emergentes (D2) y qué habilidades pide hoy el mercado laboral mexicano.',
  },
  {
    q: '¿Con quién voy a hablar?',
    a: 'Con Samuel Ruiz, economista y fundador de OIA-EE. Sam revisa cada solicitud personalmente y te contacta en máximo 24 horas hábiles para confirmar detalles, tanto para Express como para Profundo.',
  },
  {
    q: '¿Qué hago con el reporte cuando lo recibo?',
    a: 'El PDF está diseñado para presentarse a Consejo Académico o Rectoría. El Express es ideal para abrir conversación interna; el Profundo trae el plan curricular detallado por competencia y la sesión de presentación.',
  },
]

function PertinenciaContent() {
  const searchParams = useSearchParams()
  const carreraParam = searchParams.get('carrera') ?? ''
  const iesParam = searchParams.get('ies') ?? ''

  const [form, setForm] = useState({
    nombre_contacto: '',
    email_contacto: '',
    ies_nombre: iesParam,
    carrera_nombre: carreraParam,
    mensaje: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [submittedBenchmark, setSubmittedBenchmark] = useState<BenchmarkCareerSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [benchmarkCareers, setBenchmarkCareers] = useState<BenchmarkCareerSummary[]>([])
  const [totalSolicitudes, setTotalSolicitudes] = useState<number | null>(null)
  const [tendenciaNac, setTendenciaNac] = useState<TendenciaNacional | null>(null)

  useEffect(() => {
    getBenchmarkCareers().then(setBenchmarkCareers).catch(() => {})
    fetch(`${BASE}/pertinencia/contador`).then(r => r.json()).then(d => setTotalSolicitudes(d.total)).catch(() => {})
    getTendenciasNacionales(30).then(list => setTendenciaNac(list[list.length - 1] ?? null)).catch(() => {})
  }, [])

  const matchedBenchmark = useMemo<BenchmarkCareerSummary | null>(() => {
    const q = form.carrera_nombre.toLowerCase().trim()
    if (q.length < 4) return null
    const words = q.split(/\s+/).filter(w => w.length > 3)
    return benchmarkCareers.find(c => {
      const n = c.nombre.toLowerCase()
      return words.some(w => n.includes(w)) || n.includes(q)
    }) ?? null
  }, [form.carrera_nombre, benchmarkCareers])

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/pertinencia/solicitud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? `Error ${res.status}`)
      }
      setSubmittedBenchmark(matchedBenchmark)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="oportunidad">Diagnóstico Express · Gratuito</Badge>
          <Badge variant="neutro">Para instituciones</Badge>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Diagnóstico Express de Pertinencia</h1>
        <p className="text-slate-600 mt-2 text-base leading-relaxed max-w-2xl">
          Analizamos hasta <strong>3 carreras</strong> de tu institución con la metodología OIA-EE:
          5 fuentes internacionales, mercado laboral mexicano y exposición a IA. Reporte ejecutivo
          PDF entregado en 7–10 días hábiles. Sin costo, sin compromisos.
        </p>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-2xl">
          ¿Necesitas las 17 carreras + plan curricular completo + sesión a Consejo?{' '}
          <a href="#estudio-profundo" className="text-brand-600 hover:underline font-medium">
            Conoce el Estudio Profundo →
          </a>
        </p>
        {totalSolicitudes !== null && totalSolicitudes >= 10 && (
          <p className="mt-3 text-sm text-emerald-700 font-medium">
            ✓ {totalSolicitudes} instituciones ya solicitaron su diagnóstico
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: form (2/3) */}
        <div className="col-span-2">
          {done ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">✓</div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Solicitud recibida</h2>
              <p className="text-slate-600 text-sm mb-4">
                Sam revisará tu solicitud y te escribirá directamente al correo en las próximas 24 horas hábiles.
              </p>
              <div className="flex flex-col gap-2 items-center">
                {submittedBenchmark ? (
                  <>
                    <Link href={`/benchmarks/${submittedBenchmark.slug}`} className="text-brand-600 text-sm hover:underline font-medium">
                      Explora el benchmark de {submittedBenchmark.nombre} →
                    </Link>
                    <Link href="/investigaciones" className="text-slate-400 text-xs hover:underline">
                      Ver todas las investigaciones
                    </Link>
                  </>
                ) : (
                  <Link href="/investigaciones" className="text-brand-600 text-sm hover:underline">
                    Mientras tanto, explora nuestras investigaciones →
                  </Link>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-5">Solicitar Diagnóstico Express gratuito</h2>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      value={form.nombre_contacto}
                      onChange={e => set('nombre_contacto', e.target.value)}
                      placeholder="Dr. Juan García"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email institucional *</label>
                    <input
                      type="email"
                      required
                      value={form.email_contacto}
                      onChange={e => set('email_contacto', e.target.value)}
                      placeholder="jgarcia@universidad.edu.mx"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Institución *</label>
                  <input
                    type="text"
                    required
                    value={form.ies_nombre}
                    onChange={e => set('ies_nombre', e.target.value)}
                    placeholder="Universidad Autónoma de México"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Carrera a analizar *</label>
                  <input
                    type="text"
                    required
                    value={form.carrera_nombre}
                    onChange={e => set('carrera_nombre', e.target.value)}
                    placeholder="Ej: Licenciatura en Derecho, Ingeniería Industrial…"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  {matchedBenchmark && (
                    <div className="mt-2 p-3 rounded-lg border border-brand-200 bg-brand-50 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-brand-700 mb-0.5">
                          Benchmark disponible: {matchedBenchmark.nombre}
                        </p>
                        <div className="flex gap-3 text-[11px] text-slate-600">
                          <span className="text-red-600">{matchedBenchmark.skills_declining} declining</span>
                          <span className="text-emerald-600">{matchedBenchmark.skills_growing} growing</span>
                          <span className={`font-semibold ${matchedBenchmark.urgencia_curricular >= 60 ? 'text-red-600' : matchedBenchmark.urgencia_curricular >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            urgencia {matchedBenchmark.urgencia_curricular}/100
                          </span>
                        </div>
                      </div>
                      <Link href={`/benchmarks/${matchedBenchmark.slug}`} className="text-[11px] text-brand-600 hover:underline shrink-0 font-medium">
                        Ver benchmark →
                      </Link>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contexto o pregunta específica (opcional)</label>
                  <textarea
                    value={form.mensaje}
                    onChange={e => set('mensaje', e.target.value)}
                    rows={3}
                    placeholder="Ej: Estamos en proceso de rediseño curricular. Nos interesa especialmente la empleabilidad a 5 años."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 text-white font-semibold text-sm rounded-md hover:bg-brand-700 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Enviando…' : 'Solicitar Diagnóstico Express gratuito'}
                </button>

                <p className="text-[11px] text-slate-400 text-center">
                  Sin costo. Sin compromisos. Solo compartimos tus datos con el analista asignado.
                </p>
              </form>
            </Card>
          )}
        </div>

        {/* Right: sidebar (1/3) */}
        <div className="space-y-4">
          {/* What's included */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">Diagnóstico Express incluye</h3>
            <ul className="space-y-2">
              {INCLUDES.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          {/* Process */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">Proceso</h3>
            <div className="space-y-3">
              {STEPS.map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{s.label}</p>
                    <p className="text-[11px] text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Contexto nacional */}
          {tendenciaNac && (tendenciaNac.d1_score != null || tendenciaNac.d2_score != null) && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">Contexto nacional</h3>
              <div className="space-y-2">
                {tendenciaNac.d1_score != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Promedio D1 nacional</span>
                    <span className={`text-sm font-bold font-mono ${tendenciaNac.d1_score >= 0.6 ? 'text-red-600' : tendenciaNac.d1_score >= 0.4 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {tendenciaNac.d1_score.toFixed(2)}
                    </span>
                  </div>
                )}
                {tendenciaNac.d2_score != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Promedio D2 nacional</span>
                    <span className={`text-sm font-bold font-mono ${tendenciaNac.d2_score >= 0.6 ? 'text-emerald-600' : tendenciaNac.d2_score >= 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                      {tendenciaNac.d2_score.toFixed(2)}
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 pt-1">Promedio de todas las carreras monitoreadas en OIA-EE</p>
              </div>
            </Card>
          )}

          {/* Muestra del reporte */}
          <Card className="p-4 border-slate-200">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">¿Cómo es el reporte?</p>
            <h3 className="text-xs font-semibold text-slate-800 mb-1 leading-snug">
              Ver una muestra real antes de solicitar
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">
              Diagnóstico D1–D6, skills con acción recomendada y comparativo vs. promedio nacional.
            </p>
            <Link
              href="/pertinencia/muestra"
              className="text-[11px] text-brand-600 hover:underline font-medium"
            >
              Ver muestra del reporte →
            </Link>
          </Card>

          {/* Carta a rectores */}
          <Card className="p-4 border-indigo-100 bg-indigo-50/50">
            <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest mb-1">Lectura recomendada</p>
            <h3 className="text-xs font-semibold text-slate-800 mb-1 leading-snug">
              Carta a rectores: qué hacer cuando el benchmark dice &ldquo;urgencia alta&rdquo;
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">
              Qué significa un score alto, qué no significa, y los primeros pasos accionables.
            </p>
            <Link
              href="/investigaciones/2026-05-carta-rectores-urgencia-curricular"
              className="text-[11px] text-indigo-600 hover:underline font-medium"
            >
              Leer la carta →
            </Link>
          </Card>
        </div>
      </div>

      {/* Estudio Profundo */}
      <div id="estudio-profundo" className="mt-12 scroll-mt-20">
        <Card className="p-6 border-amber-200 bg-amber-50/40">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1">
              <Badge variant="neutro">Producto Pago</Badge>
              <h2 className="text-2xl font-bold text-slate-900 mt-3 mb-2">Estudio Profundo de Pertinencia</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Cuando el Diagnóstico Express deja preguntas abiertas, el Estudio Profundo entrega
                la matriz completa: 17 carreras, plan curricular accionable por skill, sesión de
                presentación a Consejo Académico. Es el mismo motor con la cobertura completa.
              </p>
              <ul className="space-y-2 mb-1">
                {ESTUDIO_PROFUNDO.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-amber-600 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center shrink-0 md:w-56">
              <p className="text-3xl font-bold text-slate-900">$120,000</p>
              <p className="text-xs text-slate-500">MXN · ≈ $6,000 USD</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-4">Pago único · 15 días hábiles</p>
              <Link
                href="mailto:sam.economia@gmail.com?subject=Cotización%20Estudio%20Profundo%20de%20Pertinencia"
                className="inline-block w-full bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                Solicitar cotización →
              </Link>
              <p className="text-[11px] text-slate-400 mt-2">
                ¿Suscribes Pro o Enterprise?{' '}
                <Link href="/planes" className="text-brand-600 hover:underline">
                  Incluye 1 Estudio Profundo/año
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Preguntas frecuentes</h2>
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-800">{item.q}</span>
                <span className="text-slate-400 text-base ml-4 shrink-0">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PertinenciaPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Cargando…</div>}>
      <PertinenciaContent />
    </Suspense>
  )
}
