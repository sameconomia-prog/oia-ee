'use client'
import { useEffect, useState } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''

type Lead = {
  id: string
  nombre: string
  cargo: string | null
  ies_nombre: string
  email: string
  telefono: string | null
  mensaje: string | null
  origen: string
  estado: string
  created_at: string | null
}

const ESTADOS = ['nuevo', 'contactado', 'calificado', 'cerrado', 'descartado']

const ESTADO_COLOR: Record<string, string> = {
  nuevo: 'bg-blue-100 text-blue-800',
  contactado: 'bg-yellow-100 text-yellow-800',
  calificado: 'bg-emerald-100 text-emerald-700',
  cerrado: 'bg-slate-100 text-slate-600',
  descartado: 'bg-red-100 text-red-700',
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const qs = estadoFilter ? `?estado=${estadoFilter}` : ''
      const res = await fetch(`${BASE}/publico/leads${qs}`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setLeads(await res.json())
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [estadoFilter])

  async function changeEstado(id: string, estado: string) {
    setUpdating(id)
    try {
      await fetch(`${BASE}/publico/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ estado }),
      })
      setLeads(prev => prev.map(l => l.id === id ? { ...l, estado } : l))
    } finally {
      setUpdating(null)
    }
  }

  const visible = leads.filter(l =>
    !filter || l.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    l.ies_nombre.toLowerCase().includes(filter.toLowerCase()) ||
    l.email.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads — Solicitudes de Demo</h1>
          <p className="text-sm text-slate-500 mt-0.5">{leads.length} registros totales</p>
        </div>
        <button onClick={load} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Buscar por nombre, IES o email…"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-72"
        />
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Cargando…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Sin registros</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre / Cargo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Institución</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Origen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{lead.nombre}</p>
                    {lead.cargo && <p className="text-xs text-slate-500">{lead.cargo}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{lead.ies_nombre}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline text-xs">{lead.email}</a>
                    {lead.telefono && <p className="text-xs text-slate-500">{lead.telefono}</p>}
                    {lead.mensaje && (
                      <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate" title={lead.mensaje}>{lead.mensaje}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{lead.origen}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.estado}
                      disabled={updating === lead.id}
                      onChange={e => changeEstado(lead.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${ESTADO_COLOR[lead.estado] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                    {lead.created_at ? lead.created_at.slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
