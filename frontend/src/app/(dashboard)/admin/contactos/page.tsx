'use client'
import { useEffect, useState } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''

type Contacto = {
  id: string
  tipo: string
  nombre: string
  cargo: string | null
  institucion: string
  email: string
  area_interes: string | null
  mensaje: string | null
  estado: string
  created_at: string | null
}

const TIPO_LABEL: Record<string, string> = {
  ies: 'IES',
  gobierno: 'Gobierno',
}

const TIPO_COLOR: Record<string, string> = {
  ies: 'bg-blue-100 text-blue-800',
  gobierno: 'bg-violet-100 text-violet-800',
}

const ESTADO_COLOR: Record<string, string> = {
  nuevo: 'bg-blue-100 text-blue-800',
  contactado: 'bg-yellow-100 text-yellow-800',
  calificado: 'bg-emerald-100 text-emerald-700',
  cerrado: 'bg-slate-100 text-slate-600',
  descartado: 'bg-red-100 text-red-700',
}

export default function AdminContactosPage() {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ x_admin_key: ADMIN_KEY })
      if (tipoFilter) params.set('tipo', tipoFilter)
      const res = await fetch(`${BASE}/publico/contacto?${params}`)
      if (!res.ok) throw new Error(`${res.status}`)
      setContactos(await res.json())
    } catch {
      setContactos([])
    } finally {
      setLoading(false)
    }
  }

  async function cambiarEstado(id: string, estado: string) {
    const params = new URLSearchParams({ x_admin_key: ADMIN_KEY })
    const res = await fetch(`${BASE}/publico/contacto/${id}?${params}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    if (!res.ok) return
    setContactos(prev => prev.map(c => c.id === id ? { ...c, estado } : c))
  }

  useEffect(() => { load() }, [tipoFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = contactos.filter(c =>
    !filter ||
    c.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    c.email.toLowerCase().includes(filter.toLowerCase()) ||
    c.institucion.toLowerCase().includes(filter.toLowerCase())
  )

  function exportCSV() {
    const header = 'ID,Tipo,Nombre,Cargo,Institución,Email,Área interés,Estado,Fecha'
    const rows = visible.map(c =>
      `"${c.id}","${TIPO_LABEL[c.tipo] ?? c.tipo}","${c.nombre}","${c.cargo ?? ''}","${c.institucion}","${c.email}","${c.area_interes ?? ''}","${c.estado}","${c.created_at?.slice(0, 10) ?? ''}"`
    )
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contactos-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Contactos Landing</h1>
          <p className="text-sm text-slate-500 mt-0.5">{visible.length} contacto{visible.length !== 1 ? 's' : ''} visibles</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={visible.length === 0}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar por nombre, email o institución…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <select
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Todos los tipos</option>
          <option value="ies">IES</option>
          <option value="gobierno">Gobierno</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Cargando contactos...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No hay contactos con estos filtros.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold">Institución</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold">Área interés</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => (
                <tr key={c.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{c.nombre}</p>
                    {c.cargo && <p className="text-xs text-slate-400">{c.cargo}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{c.institucion}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${c.email}`} className="text-indigo-600 hover:underline text-xs">
                      {c.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[c.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                      {TIPO_LABEL[c.tipo] ?? c.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.area_interes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.estado}
                      onChange={e => cambiarEstado(c.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-300 ${ESTADO_COLOR[c.estado] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {['nuevo', 'contactado', 'calificado', 'cerrado', 'descartado'].map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                    {c.created_at?.slice(0, 10) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail: mensajes */}
      {visible.some(c => c.mensaje) && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Mensajes recibidos</h2>
          <div className="space-y-2">
            {visible.filter(c => c.mensaje).map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700">{c.nombre}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">{c.institucion}</span>
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[c.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                    {TIPO_LABEL[c.tipo] ?? c.tipo}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{c.mensaje}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
