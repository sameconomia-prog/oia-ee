'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated, getStoredIesId } from '@/lib/auth'
import { getAlertas, markAlertaRead, marcarTodasAlertas } from '@/lib/api'
import type { AlertaDB } from '@/lib/types'

const SEV_CONFIG = {
  alta:  { bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-800',   label: 'Alta'  },
  media: { bg: 'bg-amber-50',  border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800', label: 'Media' },
}

const TIPO_LABEL: Record<string, string> = {
  d1_alto: 'D1 Riesgo Alto',
  d2_bajo: 'D2 Oportunidad Baja',
  ambos:   'D1+D2 Crítico',
}

const PAGE_SIZE = 25

export default function AlertasPage() {
  const router = useRouter()
  const iesId = getStoredIesId()
  const [alertas, setAlertas] = useState<AlertaDB[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterLeida, setFilterLeida] = useState<'todas' | 'no_leidas' | 'leidas'>('todas')
  const [filterSev, setFilterSev] = useState<'todas' | 'alta' | 'media'>('todas')

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    if (!iesId) { router.push('/login'); return }
  }, [router, iesId])

  const load = useCallback(async () => {
    if (!iesId) return
    setLoading(true)
    try {
      const data = await getAlertas(iesId, { skip: page * PAGE_SIZE, limit: PAGE_SIZE })
      setAlertas(data.alertas)
      setTotal(data.total)
    } catch { setAlertas([]) }
    finally { setLoading(false) }
  }, [iesId, page])

  useEffect(() => { load() }, [load])

  async function handleMarkRead(id: string) {
    await markAlertaRead(id)
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, leida: true } : a))
  }

  async function handleMarkAll() {
    await marcarTodasAlertas()
    setAlertas(prev => prev.map(a => ({ ...a, leida: true })))
  }

  function exportCSV() {
    const header = 'ID,Carrera,Tipo,Severidad,Título,Fecha,Leída'
    const rows = visible.map(a =>
      `"${a.id}","${a.carrera_nombre}","${TIPO_LABEL[a.tipo] ?? a.tipo}","${a.severidad}","${a.titulo.replace(/"/g, '""')}","${a.fecha.slice(0, 10)}","${a.leida ? 'Sí' : 'No'}"`
    )
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `alertas-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const visible = alertas
    .filter(a => {
      if (filterLeida === 'no_leidas') return !a.leida
      if (filterLeida === 'leidas') return a.leida
      return true
    })
    .filter(a => filterSev === 'todas' || a.severidad === filterSev)

  const noLeidas = alertas.filter(a => !a.leida).length
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (!iesId) return null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alertas de Riesgo</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} alertas totales · <span className={noLeidas > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>{noLeidas} no leídas</span>
          </p>
        </div>
        <div className="flex gap-2">
          {noLeidas > 0 && (
            <button
              onClick={handleMarkAll}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Marcar todas como leídas
            </button>
          )}
          <button
            onClick={exportCSV}
            disabled={visible.length === 0}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['todas', 'no_leidas', 'leidas'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterLeida(f)}
              className={`px-3 py-1.5 transition-colors ${filterLeida === f ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'todas' ? 'Todas' : f === 'no_leidas' ? 'No leídas' : 'Leídas'}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['todas', 'alta', 'media'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterSev(f)}
              className={`px-3 py-1.5 transition-colors ${filterSev === f ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'todas' ? 'Toda severidad' : f === 'alta' ? '🔴 Alta' : '🟡 Media'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Cargando alertas...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm mb-2">No hay alertas con estos filtros</p>
          <Link href="/rector" className="text-sm text-indigo-600 hover:underline">← Volver al dashboard</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(alerta => {
            const sev = SEV_CONFIG[alerta.severidad] ?? SEV_CONFIG.media
            return (
              <div
                key={alerta.id}
                className={`rounded-xl border p-4 transition-opacity ${sev.bg} ${sev.border} ${alerta.leida ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}>
                        {sev.label}
                      </span>
                      <span className="text-xs text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">
                        {TIPO_LABEL[alerta.tipo] ?? alerta.tipo}
                      </span>
                      <Link
                        href={`/carreras/${alerta.carrera_id}`}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {alerta.carrera_nombre}
                      </Link>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">{alerta.titulo}</p>
                    {alerta.mensaje && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alerta.mensaje}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">
                      {alerta.fecha.slice(0, 10)}
                    </p>
                  </div>
                  {!alerta.leida && (
                    <button
                      onClick={() => handleMarkRead(alerta.id)}
                      className="shrink-0 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded border border-slate-200 bg-white/60 hover:bg-white transition-colors"
                    >
                      Marcar leída
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            ← Anterior
          </button>
          <span className="text-slate-500">Página {page + 1} de {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            Siguiente →
          </button>
        </div>
      )}

      <div className="mt-6">
        <Link href="/rector" className="text-sm text-indigo-600 hover:underline">← Volver al dashboard rector</Link>
      </div>
    </div>
  )
}
