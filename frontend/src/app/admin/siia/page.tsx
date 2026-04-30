'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getStoredRol } from '@/lib/auth'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface SiiaRow {
  id: string
  carrera_id: string | null
  ciclo: string
  nivel: string | null
  matricula: number | null
  egresados: number | null
  titulados: number | null
  costo_anual_mxn: number | null
  cve_sep: string | null
  recibido_at: string | null
  procesado: boolean
}

interface IesOption { id: string; nombre: string; nombre_corto: string | null }

function authH(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AdminSiiaPage() {
  const router = useRouter()
  const [iesOptions, setIesOptions] = useState<IesOption[]>([])
  const [selectedIes, setSelectedIes] = useState('')
  const [cicloFiltro, setCicloFiltro] = useState('')
  const [rows, setRows] = useState<SiiaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [tokenResult, setTokenResult] = useState<{ ies_id: string; token: string } | null>(null)
  const [generandoToken, setGenerandoToken] = useState(false)

  useEffect(() => {
    const rol = getStoredRol()
    if (rol !== 'superadmin') { router.replace('/'); return }
    fetch(`${BASE}/admin/ies`, { headers: authH() })
      .then(r => r.ok ? r.json() : [])
      .then(setIesOptions)
  }, [router])

  async function fetchDatos() {
    if (!selectedIes) return
    setLoading(true)
    const qs = cicloFiltro ? `?ciclo=${cicloFiltro}` : ''
    const data = await fetch(`${BASE}/siia/datos/${selectedIes}${qs}`, { headers: authH() })
      .then(r => r.ok ? r.json() : [])
    setRows(data)
    setLoading(false)
  }

  async function generarToken() {
    if (!selectedIes) return
    setGenerandoToken(true)
    setTokenResult(null)
    const resp = await fetch(`${BASE}/siia/tokens/crear?ies_id=${selectedIes}`, {
      method: 'POST', headers: authH(),
    })
    if (resp.ok) setTokenResult(await resp.json())
    setGenerandoToken(false)
  }

  async function revocarToken() {
    if (!selectedIes) return
    await fetch(`${BASE}/siia/tokens/${selectedIes}`, { method: 'DELETE', headers: authH() })
    alert('Token revocado.')
  }

  const iesName = iesOptions.find(i => i.id === selectedIes)?.nombre_corto ?? iesOptions.find(i => i.id === selectedIes)?.nombre ?? ''

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader
        title="Integración SIIA Enterprise"
        subtitle="Tokens de autenticación y datos de matrícula recibidos por webhook"
      />

      {/* Selector IES + acciones token */}
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">IES</label>
            <select
              value={selectedIes}
              onChange={e => setSelectedIes(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— Seleccionar IES —</option>
              {iesOptions.map(i => <option key={i.id} value={i.id}>{i.nombre_corto ?? i.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Filtrar ciclo</label>
            <input
              type="text"
              placeholder="Ej: 2025-1"
              value={cicloFiltro}
              onChange={e => setCicloFiltro(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={fetchDatos}
            disabled={!selectedIes}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Ver datos
          </button>
        </div>

        {selectedIes && (
          <div className="mt-4 flex gap-3 flex-wrap">
            <button
              onClick={generarToken}
              disabled={generandoToken}
              className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors"
            >
              {generandoToken ? 'Generando...' : 'Generar / Renovar token SIIA'}
            </button>
            <button
              onClick={revocarToken}
              className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              Revocar token
            </button>
          </div>
        )}

        {tokenResult && (
          <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-teal-800 mb-1">Token generado — guárdalo ahora, no se mostrará de nuevo:</p>
            <code className="text-xs font-mono text-teal-900 bg-teal-100 px-2 py-1 rounded break-all select-all">
              {tokenResult.token}
            </code>
            <p className="text-xs text-teal-600 mt-2">
              La IES debe incluir este token en el header <code>X-SIIA-Token</code> en cada llamada a{' '}
              <code>POST /siia/webhook</code>.
            </p>
          </div>
        )}
      </Card>

      {/* Tabla de datos SIIA */}
      {selectedIes && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">
              Datos SIIA — {iesName}{cicloFiltro ? ` · ${cicloFiltro}` : ''} ({rows.length} registros)
            </h2>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Cargando...</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Sin datos SIIA recibidos aún para esta IES.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Ciclo</th>
                    <th className="px-4 py-2.5 text-left">Nivel</th>
                    <th className="px-4 py-2.5 text-center">Matrícula</th>
                    <th className="px-4 py-2.5 text-center">Egresados</th>
                    <th className="px-4 py-2.5 text-center">Titulados</th>
                    <th className="px-4 py-2.5 text-center">Costo anual</th>
                    <th className="px-4 py-2.5 text-center">Estado</th>
                    <th className="px-4 py-2.5 text-left">Recibido</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono font-semibold text-slate-700">{r.ciclo}</td>
                      <td className="px-4 py-2 text-slate-500">{r.nivel ?? '—'}</td>
                      <td className="px-4 py-2 text-center font-mono">{r.matricula?.toLocaleString('es-MX') ?? '—'}</td>
                      <td className="px-4 py-2 text-center font-mono">{r.egresados?.toLocaleString('es-MX') ?? '—'}</td>
                      <td className="px-4 py-2 text-center font-mono">{r.titulados?.toLocaleString('es-MX') ?? '—'}</td>
                      <td className="px-4 py-2 text-center font-mono">{r.costo_anual_mxn ? `$${r.costo_anual_mxn.toLocaleString('es-MX')}` : '—'}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant={r.procesado ? 'oportunidad' : 'neutro'}>
                          {r.procesado ? 'Procesado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-slate-400">{fmt(r.recibido_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
