'use client'
import { useState } from 'react'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const FEATURES = [
  'Dashboard D1–D7 en tiempo real por carrera',
  'Alertas automáticas de riesgo IA',
  'Reporte PDF ejecutivo para rectores',
  'Benchmark contra promedio nacional',
  'Proyecciones a 1, 3 y 5 años',
  'Widget embebible para tu sitio web',
]

export default function SolicitarDemoPage() {
  const [form, setForm] = useState({ nombre: '', cargo: '', ies_nombre: '', email: '', telefono: '', mensaje: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/publico/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, origen: 'demo' }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setDone(true)
    } catch {
      setError('No se pudo enviar la solicitud. Intenta de nuevo o escríbenos directamente.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Solicitud recibida!</h1>
        <p className="text-slate-500 text-sm mb-6">
          Gracias, <strong>{form.nombre}</strong>. Nuestro equipo te contactará en las próximas 24–48 horas
          al correo <strong>{form.email}</strong>.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/kpis" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
            Explorar KPIs →
          </Link>
          <Link href="/" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Solicita una Demo</h1>
        <p className="text-sm text-slate-500 mt-1">
          Descubre cómo OIA-EE puede ayudar a tu institución a anticipar el impacto de la IA en sus carreras.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form */}
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre completo *</label>
              <input required value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Dr. Juan Pérez" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cargo</label>
              <input value={form.cargo} onChange={e => set('cargo', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Rector / Director Académico" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Institución *</label>
            <input required value={form.ies_nombre} onChange={e => set('ies_nombre', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Universidad Nacional de..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email institucional *</label>
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="rector@universidad.edu.mx" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="+52 (33) ..." />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">¿En qué te podemos ayudar?</label>
            <textarea rows={3} value={form.mensaje} onChange={e => set('mensaje', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              placeholder="Número de carreras, problema actual, interés específico..." />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Enviando...' : 'Solicitar demo gratuita →'}
          </button>

          <p className="text-[10px] text-slate-400 text-center">
            Sin compromiso · Respuesta en 24–48 h · Datos protegidos conforme a la LFPDPPP
          </p>
        </form>

        {/* Benefits */}
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
            <h2 className="font-semibold text-indigo-900 mb-3 text-sm">¿Qué incluye la demo?</h2>
            <ul className="space-y-2">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-indigo-800">
                  <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-800 mb-2 text-sm">¿Por qué OIA-EE?</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Somos el único observatorio en México especializado en medir el impacto de la inteligencia artificial
              sobre la empleabilidad de los egresados universitarios. Nuestros índices D1–D7 combinan datos de
              vacantes laborales, IMSS, ENOE y noticias globales para darte una visión completa y accionable.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/metodologia" className="text-xs text-indigo-600 hover:underline">Ver metodología →</Link>
              <span className="text-slate-300">·</span>
              <Link href="/kpis" className="text-xs text-indigo-600 hover:underline">Explorar datos →</Link>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-5">
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &ldquo;Las instituciones que anticipen el impacto de la IA en sus carreras tendrán una ventaja
              competitiva crítica en los próximos 5 años.&rdquo;
            </p>
            <p className="text-[10px] text-slate-500 mt-2">— Equipo OIA-EE</p>
          </div>
        </div>
      </div>
    </div>
  )
}
