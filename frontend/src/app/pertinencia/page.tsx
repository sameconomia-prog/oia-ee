'use client'
import { useState } from 'react'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Step = 'form' | 'success'

interface FormState {
  nombre_contacto: string
  email_contacto: string
  ies_nombre: string
  carrera_nombre: string
  mensaje: string
}

const EMPTY: FormState = {
  nombre_contacto: '',
  email_contacto: '',
  ies_nombre: '',
  carrera_nombre: '',
  mensaje: '',
}

const BENEFICIOS = [
  { icon: '📊', text: 'Análisis D1–D7 completo de la carrera seleccionada' },
  { icon: '📄', text: 'Reporte PDF ejecutivo de 11 páginas' },
  { icon: '🏛️', text: 'Comparativo vs media nacional de IES mexicanas' },
  { icon: '🗺️', text: 'Plan curricular de mejora basado en evidencia' },
  { icon: '📅', text: 'Entrega en 15 días hábiles · Sin compromiso de compra' },
]

export default function PertinenciaPage() {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate(): boolean {
    const e: Partial<FormState> = {}
    if (!form.nombre_contacto.trim()) e.nombre_contacto = 'Requerido'
    if (!form.email_contacto.trim()) e.email_contacto = 'Requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_contacto)) e.email_contacto = 'Email inválido'
    if (!form.ies_nombre.trim()) e.ies_nombre = 'Requerido'
    if (!form.carrera_nombre.trim()) e.carrera_nombre = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setServerError('')
    try {
      const res = await fetch(`${BASE}/pertinencia/solicitud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_contacto: form.nombre_contacto.trim(),
          email_contacto: form.email_contacto.trim(),
          ies_nombre: form.ies_nombre.trim(),
          carrera_nombre: form.carrera_nombre.trim(),
          mensaje: form.mensaje.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail ?? `Error ${res.status}`)
      }
      setStep('success')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al enviar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function field(
    id: keyof FormState,
    label: string,
    placeholder: string,
    type = 'text',
    required = true,
  ) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          id={id}
          type={type}
          value={form[id]}
          onChange={ev => setForm(f => ({ ...f, [id]: ev.target.value }))}
          placeholder={placeholder}
          className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
            errors[id] ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
          }`}
        />
        {errors[id] && <p className="mt-1 text-xs text-red-600">{errors[id]}</p>}
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Solicitud recibida</h1>
        <p className="text-slate-500 text-sm mb-2">
          Hemos registrado tu solicitud de Estudio de Pertinencia para{' '}
          <strong className="text-slate-800">{form.carrera_nombre}</strong> en{' '}
          <strong className="text-slate-800">{form.ies_nombre}</strong>.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Nuestro equipo se pondrá en contacto con <strong className="text-slate-700">{form.email_contacto}</strong>{' '}
          en los próximos 2 días hábiles. Recibirás el reporte en hasta 15 días hábiles.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/plataforma"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Explorar la plataforma
          </Link>
          <Link
            href="/planes"
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Ver planes anuales
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-3 border border-amber-200">
          Estudio de Pertinencia Ad-hoc · $120,000 MXN
        </span>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Solicita tu Estudio de Pertinencia gratuito
        </h1>
        <p className="text-slate-500 text-base max-w-xl mx-auto">
          Recibe un análisis real de riesgo y oportunidad IA para una carrera de tu institución.
          Reporte ejecutivo PDF de 11 páginas, listo en 15 días hábiles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Formulario */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">Datos de contacto</h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {field('nombre_contacto', 'Nombre completo', 'Lic. María González')}
            {field('email_contacto', 'Correo institucional', 'mgonzalez@universidad.edu.mx', 'email')}
            {field('ies_nombre', 'Nombre de la institución', 'Universidad Autónoma de...')}
            {field('carrera_nombre', 'Carrera a analizar', 'Ej: Contaduría Pública, Derecho...')}

            <div>
              <label htmlFor="mensaje" className="block text-sm font-medium text-slate-700 mb-1">
                Mensaje o contexto <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="mensaje"
                value={form.mensaje}
                onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
                placeholder="¿Hay algo específico que quieras analizar o un contexto relevante?"
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-white"
              />
            </div>

            {serverError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enviando...' : 'Solicitar estudio gratuito →'}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              Sin costo de compromiso · Datos protegidos bajo LFPDPPP
            </p>
          </form>
        </div>

        {/* Beneficios */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">¿Qué recibes?</h2>
            <ul className="space-y-3">
              {BENEFICIOS.map(b => (
                <li key={b.text} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{b.icon}</span>
                  <span className="text-sm text-slate-600">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Proceso */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Proceso en 3 pasos</h3>
            <ol className="space-y-3">
              {[
                { n: '1', t: 'Recibimos tu solicitud', d: 'Confirmación inmediata por email' },
                { n: '2', t: 'Análisis y modelado', d: 'Nuestro equipo procesa los datos D1–D7 en 15 días hábiles' },
                { n: '3', t: 'Entrega del reporte', d: 'PDF ejecutivo + reunión virtual de presentación' },
              ].map(s => (
                <li key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.t}</p>
                    <p className="text-xs text-slate-500">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Social proof */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <p className="text-sm text-indigo-800 font-medium mb-1">
              ¿Listo para un plan anual?
            </p>
            <p className="text-xs text-indigo-600 mb-3">
              El estudio de pertinencia es la puerta de entrada ideal antes de suscribir un plan Starter, Pro o Enterprise.
            </p>
            <Link
              href="/planes"
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
              Ver planes y precios →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
