'use client'
import { useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const AREAS = [
  'Ingeniería y Tecnología',
  'Ciencias Sociales y Humanidades',
  'Ciencias de la Salud',
  'Administración y Negocios',
  'Ciencias Exactas',
  'Educación',
  'Arte y Diseño',
  'Otra',
]

export default function PertinenciaPage() {
  const [form, setForm] = useState({
    nombre_contacto: '',
    email_contacto: '',
    ies_nombre: '',
    carrera_nombre: '',
    mensaje: '',
  })
  const [estado, setEstado] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEstado('loading')
    setErrMsg('')
    try {
      const res = await fetch(`${API}/pertinencia/solicitud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErrMsg(d.detail ?? 'Error al enviar la solicitud. Intenta de nuevo.')
        setEstado('error')
        return
      }
      setEstado('ok')
    } catch {
      setErrMsg('Error de conexión. Verifica tu internet e intenta de nuevo.')
      setEstado('error')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/demo" className="font-bold text-indigo-700 text-lg">OIA-EE</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/ranking" className="text-slate-600 hover:text-indigo-700">Ranking</Link>
          <Link href="/demo" className="text-slate-600 hover:text-indigo-700">Producto</Link>
          <Link href="/login" className="text-slate-600 hover:text-indigo-700">Acceso</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-10">
          <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-indigo-100">
            Estudio de Pertinencia Ad-hoc
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Solicita un análisis de pertinencia para tu carrera
          </h1>
          <p className="text-slate-500 leading-relaxed">
            Nuestro equipo generará un reporte personalizado de 10+ páginas con análisis D1–D7,
            comparativo sectorial, proyección a 5 años y recomendaciones de actualización curricular.
            Respuesta en 2 días hábiles.
          </p>
        </div>

        {/* Beneficios */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {[
            ['Reporte 10+ páginas', 'Metodología D1–D7 completa'],
            ['Comparativo sectorial', 'Posicionamiento vs. carreras similares'],
            ['Proyección 5 años', 'Escenarios pesimista/base/optimista'],
            ['Recomendaciones', 'Plan de actualización curricular con IA'],
          ].map(([t, d]) => (
            <div key={t} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="font-semibold text-sm text-slate-800">{t}</p>
              <p className="text-xs text-slate-500 mt-0.5">{d}</p>
            </div>
          ))}
        </div>

        {/* Formulario / Confirmación */}
        {estado === 'ok' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-emerald-800 mb-2">Solicitud recibida</h2>
            <p className="text-emerald-700 text-sm mb-6">
              Te enviamos una confirmación a <strong>{form.email_contacto}</strong>. Nuestro equipo
              se pondrá en contacto en los próximos 2 días hábiles.
            </p>
            <Link
              href="/demo"
              className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Ver la plataforma completa →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
                <input
                  name="nombre_contacto"
                  type="text"
                  required
                  value={form.nombre_contacto}
                  onChange={handleChange}
                  placeholder="Dra. María García"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo institucional *</label>
                <input
                  name="email_contacto"
                  type="email"
                  required
                  value={form.email_contacto}
                  onChange={handleChange}
                  placeholder="mgarcia@universidad.edu.mx"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Institución *</label>
              <input
                name="ies_nombre"
                type="text"
                required
                value={form.ies_nombre}
                onChange={handleChange}
                placeholder="Universidad Autónoma de Nuevo León"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Carrera a analizar *</label>
              <input
                name="carrera_nombre"
                type="text"
                required
                value={form.carrera_nombre}
                onChange={handleChange}
                placeholder="Licenciatura en Contaduría Pública"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contexto adicional</label>
              <textarea
                name="mensaje"
                rows={4}
                value={form.mensaje}
                onChange={handleChange}
                placeholder="¿Hay alguna preocupación específica? ¿Están en proceso de rediseño curricular? ¿Acreditación próxima?"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {estado === 'error' && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errMsg}</p>
            )}

            <button
              type="submit"
              disabled={estado === 'loading'}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 text-sm"
            >
              {estado === 'loading' ? 'Enviando...' : 'Solicitar estudio de pertinencia →'}
            </button>

            <p className="text-center text-xs text-slate-400">
              Sin compromiso. Respuesta garantizada en 2 días hábiles.
              <br />
              También puedes escribir a{' '}
              <a href="mailto:sam.economia@gmail.com" className="text-indigo-600 hover:underline">
                sam.economia@gmail.com
              </a>
            </p>
          </form>
        )}
      </main>

      <footer className="border-t border-slate-100 py-6 px-6 text-center text-xs text-slate-400 mt-8">
        <p>© {new Date().getFullYear()} OIA-EE — Observatorio de Impacto IA en Educación y Empleo</p>
        <p className="mt-1">
          <Link href="/privacidad" className="hover:text-indigo-700">Aviso de privacidad</Link>
          {' · '}
          <Link href="/terminos" className="hover:text-indigo-700">Términos de servicio</Link>
        </p>
      </footer>
    </div>
  )
}
