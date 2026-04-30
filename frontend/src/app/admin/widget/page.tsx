'use client'
import { useState, useEffect } from 'react'
import { getAdminIes } from '@/lib/api'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://oia-ee.com'

type IesItem = { id: string; nombre: string; nombre_corto: string | null }

export default function WidgetAdminPage() {
  const [ies, setIes] = useState<IesItem[]>([])
  const [selected, setSelected] = useState('')
  const [copied, setCopied] = useState(false)
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''

  useEffect(() => {
    if (!adminKey) return
    getAdminIes(adminKey)
      .then(data => {
        setIes(data)
        if (data.length > 0) setSelected(data[0].id)
      })
      .catch(() => {})
  }, [adminKey])

  const embedUrl = selected ? `${APP_URL}/embed/ies/${selected}` : ''

  const iframeCode = selected
    ? `<iframe\n  src="${embedUrl}"\n  width="380"\n  height="220"\n  frameborder="0"\n  style="border:none; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08);"\n></iframe>`
    : ''

  function copyCode() {
    navigator.clipboard.writeText(iframeCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Widget Embebible</h1>
      <p className="text-sm text-slate-500 mb-6">
        Genera un iframe con los KPIs de tu institución para incrustar en tu sitio web.
      </p>

      {!adminKey ? (
        <p className="text-sm text-red-500">Se requiere clave de administrador. Inicia sesión en /admin.</p>
      ) : (
        <>
          {/* Selector de IES */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
              Institución
            </label>
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {ies.map(i => (
                <option key={i.id} value={i.id}>
                  {i.nombre_corto ?? i.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {selected && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2">
                Vista previa
              </p>
              <div className="bg-slate-100 rounded-xl p-6 flex justify-center">
                <iframe
                  src={embedUrl}
                  width="380"
                  height="220"
                  frameBorder="0"
                  className="rounded-xl shadow-md"
                  title="Widget KPI"
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Vista en tiempo real del widget en {embedUrl}
              </p>
            </div>
          )}

          {/* Código */}
          {selected && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Código HTML
                </p>
                <button
                  onClick={copyCode}
                  className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                    copied
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {copied ? '✓ Copiado' : 'Copiar código'}
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-300 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed">
                {iframeCode}
              </pre>
              <p className="text-[11px] text-slate-400 mt-2">
                Pega este código en cualquier página HTML. El widget se actualiza automáticamente cada hora.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
