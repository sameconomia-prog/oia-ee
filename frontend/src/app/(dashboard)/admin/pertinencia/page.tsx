'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getStoredRol } from '@/lib/auth'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { buscarCarreras, fetchPertinenciaReportData } from '@/lib/api'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Solicitud {
  id: string
  nombre_contacto: string
  email_contacto: string
  ies_nombre: string
  carrera_nombre: string
  mensaje: string | null
  estado: string
  created_at: string | null
}

const ESTADOS = ['pendiente', 'en_revision', 'completada', 'rechazada']

const ESTADO_VARIANT: Record<string, 'risk' | 'neutro' | 'oportunidad' | 'default'> = {
  pendiente:    'neutro',
  en_revision:  'default',
  completada:   'oportunidad',
  rechazada:    'risk',
}

function authH(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminPertinenciaPage() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<string>('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [patching, setPatching] = useState<string | null>(null)
  const [generando, setGenerando] = useState<string | null>(null)
  const [carreraSearch, setCarreraSearch] = useState<Record<string, string>>({})
  const [carreraResults, setCarreraResults] = useState<Record<string, { id: string; nombre: string }[]>>({})
  const [carreraSelected, setCarreraSelected] = useState<Record<string, { id: string; nombre: string }>>({})
  const [searching, setSearching] = useState<string | null>(null)

  useEffect(() => {
    const rol = getStoredRol()
    if (rol !== 'superadmin') { router.replace('/'); return }
    fetchData()
  }, [router])

  async function fetchData(estado?: string) {
    setLoading(true)
    const qs = estado ? `?estado=${estado}` : ''
    const data = await fetch(`${BASE}/pertinencia/solicitudes${qs}`, { headers: authH() })
      .then(r => r.ok ? r.json() : [])
    setSolicitudes(data)
    setLoading(false)
  }

  async function buscarCarrera(solicitudId: string, q: string) {
    setCarreraSearch(prev => ({ ...prev, [solicitudId]: q }))
    if (q.length < 3) { setCarreraResults(prev => ({ ...prev, [solicitudId]: [] })); return }
    setSearching(solicitudId)
    const results = await buscarCarreras(q).catch(() => [])
    setCarreraResults(prev => ({ ...prev, [solicitudId]: results }))
    setSearching(null)
  }

  async function generarPDF(sol: Solicitud, carreraId: string, carreraNombre: string) {
    setGenerando(sol.id)
    try {
      const data = await fetchPertinenciaReportData(carreraId, {
        nombre_contacto: sol.nombre_contacto,
        ies_nombre: sol.ies_nombre,
        carrera_nombre: sol.carrera_nombre,
        fecha_solicitud: fmtDate(sol.created_at),
      })
      const { generarReportePertinencia } = await import('@/lib/reporte-pertinencia')
      generarReportePertinencia(data)
    } catch (e) {
      alert(`Error generando PDF: ${String(e)}`)
    } finally {
      setGenerando(null)
    }
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    setPatching(id)
    await fetch(`${BASE}/pertinencia/solicitudes/${id}`, {
      method: 'PATCH',
      headers: authH(),
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    setPatching(null)
    fetchData(filtro || undefined)
  }

  function handleFiltro(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setFiltro(val)
    fetchData(val || undefined)
  }

  const counts = ESTADOS.reduce<Record<string, number>>((acc, e) => {
    acc[e] = solicitudes.filter(s => s.estado === e).length
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader
        title="Solicitudes de Pertinencia"
        subtitle="Gestión de estudios de pertinencia ad-hoc solicitados desde /pertinencia"
      />

      {/* KPI chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        {ESTADOS.map(e => (
          <div key={e} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-center shadow-sm">
            <p className="text-xl font-bold text-slate-800">{counts[e] ?? 0}</p>
            <p className="text-xs text-slate-500 capitalize">{e.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-slate-600 font-medium">Filtrar por estado:</label>
        <select
          value={filtro}
          onChange={handleFiltro}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todos</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
        </select>
        <span className="text-xs text-slate-400">{solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Lista */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">Cargando...</div>
        ) : solicitudes.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Sin solicitudes{filtro ? ` con estado "${filtro}"` : ''}.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {solicitudes.map(s => (
              <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={ESTADO_VARIANT[s.estado] ?? 'default'}>
                        {s.estado.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-slate-400">{fmtDate(s.created_at)}</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">{s.ies_nombre}</p>
                    <p className="text-sm text-indigo-700">{s.carrera_nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.nombre_contacto} · <a href={`mailto:${s.email_contacto}`} className="hover:underline text-indigo-600">{s.email_contacto}</a>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={s.estado}
                      disabled={patching === s.id}
                      onChange={e => cambiarEstado(s.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
                    >
                      {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                    </select>
                    <button
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                      className="text-xs text-slate-500 hover:text-indigo-700 px-2 py-1 rounded border border-slate-200 hover:border-indigo-300 transition-colors"
                    >
                      {expanded === s.id ? 'Cerrar' : 'Ver mensaje'}
                    </button>
                  </div>
                </div>
                {expanded === s.id && (
                  <div className="mt-3 space-y-3">
                    {s.mensaje && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 leading-relaxed">
                        {s.mensaje}
                      </div>
                    )}
                    {!s.mensaje && <p className="text-xs text-slate-400 italic">Sin mensaje adicional.</p>}

                    {/* Generar reporte PDF */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-indigo-800 mb-2">Generar Reporte de Pertinencia (PDF)</p>
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Buscar carrera en la BD (mín. 3 caracteres)..."
                            value={carreraSearch[s.id] ?? ''}
                            onChange={e => buscarCarrera(s.id, e.target.value)}
                            className="w-full border border-indigo-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          {(carreraResults[s.id] ?? []).length > 0 && !carreraSelected[s.id] && (
                            <ul className="mt-1 bg-white border border-slate-200 rounded shadow-sm text-xs max-h-32 overflow-y-auto">
                              {carreraResults[s.id].map(c => (
                                <li
                                  key={c.id}
                                  onClick={() => {
                                    setCarreraSelected(prev => ({ ...prev, [s.id]: c }))
                                    setCarreraSearch(prev => ({ ...prev, [s.id]: c.nombre }))
                                    setCarreraResults(prev => ({ ...prev, [s.id]: [] }))
                                  }}
                                  className="px-3 py-1.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-100"
                                >
                                  {c.nombre}
                                </li>
                              ))}
                            </ul>
                          )}
                          {searching === s.id && <p className="text-xs text-indigo-500 mt-1">Buscando...</p>}
                          {carreraSelected[s.id] && (
                            <p className="text-xs text-indigo-700 mt-1">
                              Seleccionada: <strong>{carreraSelected[s.id].nombre}</strong>
                              <button onClick={() => { setCarreraSelected(prev => { const n = {...prev}; delete n[s.id]; return n }); setCarreraSearch(prev => ({...prev, [s.id]: ''})) }} className="ml-2 text-red-500 hover:underline">×</button>
                            </p>
                          )}
                        </div>
                        <button
                          disabled={!carreraSelected[s.id] || generando === s.id}
                          onClick={() => generarPDF(s, carreraSelected[s.id].id, carreraSelected[s.id].nombre)}
                          className="shrink-0 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                        >
                          {generando === s.id ? 'Generando...' : 'Generar PDF'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
