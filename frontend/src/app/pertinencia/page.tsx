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
  'Análisis de 5 fuentes internacionales (WEF, McKinsey, CEPAL, Frey-Osborne, Anthropic)',
  'Matriz de convergencia skill-por-skill con dirección y horizonte de impacto',
  'Diagnóstico D1–D6: obsolescencia, oportunidades, mercado laboral y perfil estudiantil',
  'Recomendaciones curriculares accionables por competencia',
  'Comparativo vs. promedio nacional de la carrera',
  'Reporte PDF ejecutivo para presentar a rectoría',
]

const STEPS = [
  { n: '1', label: 'Solicitud', desc: 'Llenas el formulario en 2 minutos' },
  { n: '2', label: 'Revisión', desc: 'OIA-EE confirma en 24 horas hábiles' },
  { n: '3', label: 'Análisis', desc: 'Procesamos datos en 5–7 días hábiles' },
  { n: '4', label: 'Entrega', desc: 'Reporte PDF + sesión de presentación' },
]

const FAQ = [
  {
    q: '¿Cuánto cuesta el estudio?',
    a: 'Nada. El estudio de pertinencia curricular es completamente gratuito para instituciones de educación superior en México. OIA-EE es un observatorio académico independiente, no una consultora.',
  },
  {
    q: '¿Qué necesito proporcionar?',
    a: 'Solo el nombre de la carrera que quieres analizar y tu correo institucional. No necesitas subir documentos ni planes de estudio. Trabajamos con datos públicos y benchmarks internacionales.',
  },
  {
    q: '¿Cómo sé que el análisis es riguroso?',
    a: 'La metodología cruza 5 fuentes internacionales (WEF Future of Jobs, McKinsey, CEPAL, Frey-Osborne y Anthropic). Cada skill se clasifica por consenso porcentual entre fuentes y horizonte de impacto. Puedes explorar la metodología en /benchmarks antes de solicitar.',
  },
  {
    q: '¿El estudio habla solo de IA o es curricular en general?',
    a: 'Es específico al impacto de la automatización e IA generativa. Diagnóstica qué competencias de tu plan de estudios tienen riesgo de obsolescencia (D1), cuáles representan oportunidades emergentes (D2) y qué habilidades pide hoy el mercado laboral mexicano.',
  },
  {
    q: '¿Con quién voy a hablar?',
    a: 'Con Samuel Ruiz, economista y fundador de OIA-EE. El análisis no es automatizado: Sam revisa cada solicitud personalmente y te contacta en máximo 24 horas hábiles para confirmar detalles.',
  },
  {
    q: '¿Qué hago con el reporte cuando lo recibo?',
    a: 'El PDF está diseñado para presentarse a Consejo Académico o Rectoría. Incluye diagnóstico ejecutivo, matriz de skills por acción (retirar/rediseñar/fortalecer/agregar) y comparativo vs. promedio nacional de la carrera.',
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
          <Badge variant="oportunidad">Gratuito</Badge>
          <Badge variant="neutro">Para instituciones</Badge>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Estudio de Pertinencia Curricular</h1>
        <p className="text-slate-600 mt-2 text-base leading-relaxed max-w-2xl">
          Analizamos una carrera de tu institución con datos reales: benchmarks internacionales,
          tendencias del mercado laboral mexicano y exposición a la automatización por IA.
          Sin costo, sin compromisos.
        </p>
        {totalSolicitudes !== null && totalSolicitudes >= 10 && (
          <p className="mt-3 text-sm text-emerald-700 font-medium">
            ✓ {totalSolicitudes} instituciones ya solicitaron su análisis
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
              <h2 className="text-base font-semibold text-slate-800 mb-5">Solicitar estudio gratuito</h2>
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
                  {loading ? 'Enviando…' : 'Solicitar estudio gratuito'}
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
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">El estudio incluye</h3>
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
