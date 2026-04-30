'use client'
import { useState } from 'react'

type TabTipo = 'ies' | 'gobierno'

export default function FormularioContacto() {
  const [tab, setTab] = useState<TabTipo>('ies')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [form, setForm] = useState({
    nombre: '', cargo: '', institucion: '', email: '', mensaje: '', area_interes: 'politica_publica',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tipo: tab }),
      })
      if (res.ok) setExito(true)
    } finally {
      setLoading(false)
    }
  }

  if (exito) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="text-green-800 font-semibold">Solicitud recibida.</p>
        <p className="text-green-700 text-sm mt-1">Te contactaremos en menos de 24 horas.</p>
      </div>
    )
  }

  return (
    <section id="contacto" className="py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
          ¿Tu institución está lista para el impacto de la IA?
        </h2>
        <p className="text-gray-500 text-center mb-10">
          Cuéntanos sobre tu institución y te mostramos un primer análisis sin costo.
        </p>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 p-1 mb-8 bg-gray-50">
          {(['ies', 'gobierno'] as TabTipo[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white shadow-sm text-[#1D4ED8]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'ies' ? 'Para IES' : 'Para Gobierno / Investigadores'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
              <input required value={form.nombre} onChange={set('nombre')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
            </div>
            {tab === 'ies' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <input value={form.cargo} onChange={set('cargo')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="institucion" className="block text-sm font-medium text-gray-700 mb-1">Institución *</label>
            <input id="institucion" required value={form.institucion} onChange={set('institucion')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email institucional *</label>
            <input required type="email" value={form.email} onChange={set('email')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
          </div>
          {tab === 'gobierno' && (
            <div>
              <label htmlFor="area-interes" className="block text-sm font-medium text-gray-700 mb-1">Área de interés</label>
              <select id="area-interes" value={form.area_interes} onChange={set('area_interes')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]">
                <option value="politica_publica">Política pública</option>
                <option value="investigacion">Investigación</option>
                <option value="periodismo">Periodismo</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje (opcional)</label>
            <textarea rows={3} value={form.mensaje} onChange={set('mensaje')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Enviando...' : tab === 'ies' ? 'Solicitar análisis de mi institución' : 'Agendar llamada de contexto'}
          </button>
        </form>
      </div>
    </section>
  )
}
