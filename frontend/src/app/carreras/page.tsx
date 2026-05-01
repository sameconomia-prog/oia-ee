'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getCarrerasPublico, getAreasCarreras, getBenchmarkCareers } from '@/lib/api'
import type { CarreraKpi } from '@/lib/types'

type SortKey = 'none' | 'nombre' | 'd1' | 'd2' | 'matricula'

function exportarCSV(carreras: CarreraKpi[]) {
  const headers = ['ID', 'Nombre', 'Matricula', 'D1 Obsolescencia', 'D2 Oportunidades']
  const rows = carreras.map(c => [
    c.id,
    c.nombre,
    c.matricula ?? '',
    c.kpi?.d1_obsolescencia.score.toFixed(3) ?? '',
    c.kpi?.d2_oportunidades.score.toFixed(3) ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `carreras_oia_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ScoreBadge({ label, score, invert }: { label: string; score: number; invert?: boolean }) {
  const bad = invert ? score >= 0.6 : score < 0.4
  const ok = invert ? score < 0.4 : score >= 0.6
  const color = ok ? 'bg-green-50 text-green-700' : bad ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${color}`}>
      {label} {score.toFixed(2)}
    </span>
  )
}

const PAGE_SIZE = 25

export default function CarrerasListPage() {
  const searchParams = useSearchParams()
  const [carreras, setCarreras] = useState<CarreraKpi[]>([])
  const [busqueda, setBusqueda] = useState(() => searchParams.get('q') ?? '')
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [areaFiltro, setAreaFiltro] = useState(() => searchParams.get('area') ?? '')
  const [areas, setAreas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('none')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [benchmarkMap, setBenchmarkMap] = useState<Map<string, number>>(new Map())
  const [filterUrgenciaAlta, setFilterUrgenciaAlta] = useState(false)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    let base = carreras
    if (filterUrgenciaAlta) {
      base = base.filter(c => c.benchmark_slug && (benchmarkMap.get(c.benchmark_slug) ?? 0) >= 60)
    }
    if (sortKey === 'none') return base
    return [...base].sort((a, b) => {
      let av = 0, bv = 0
      if (sortKey === 'nombre') {
        const cmp = a.nombre.localeCompare(b.nombre, 'es')
        return sortDir === 'asc' ? cmp : -cmp
      }
      if (sortKey === 'd1') { av = a.kpi?.d1_obsolescencia.score ?? -1; bv = b.kpi?.d1_obsolescencia.score ?? -1 }
      if (sortKey === 'd2') { av = a.kpi?.d2_oportunidades.score ?? -1; bv = b.kpi?.d2_oportunidades.score ?? -1 }
      if (sortKey === 'matricula') { av = a.matricula ?? -1; bv = b.matricula ?? -1 }
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [carreras, sortKey, sortDir, filterUrgenciaAlta, benchmarkMap])

  useEffect(() => {
    getAreasCarreras().then(setAreas).catch(() => {})
    getBenchmarkCareers().then(list => {
      setBenchmarkMap(new Map(list.map(c => [c.slug, c.urgencia_curricular])))
    }).catch(() => {})
  }, [])

  const cargar = useCallback((q: string, area: string, newSkip: number, append: boolean) => {
    setLoading(true)
    getCarrerasPublico({ q: q || undefined, area: area || undefined, skip: newSkip, limit: PAGE_SIZE })
      .then(data => {
        setCarreras(prev => append ? [...prev, ...data] : data)
        setSkip(newSkip + data.length)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSkip(0)
    setCarreras([])
    cargar(query, areaFiltro, 0, false)
  }, [query, areaFiltro, cargar])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQuery(busqueda.trim())
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-xs text-indigo-600 hover:underline">← Inicio</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Carreras</h1>
        <p className="text-sm text-gray-500 mt-1">Explorar carreras con sus indicadores KPI</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar carrera por nombre..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          Buscar
        </button>
        {areas.length > 0 && (
          <select
            value={areaFiltro}
            onChange={e => setAreaFiltro(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none"
          >
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        {(query || areaFiltro) && (
          <button
            type="button"
            onClick={() => { setBusqueda(''); setQuery(''); setAreaFiltro('') }}
            className="px-3 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50"
          >
            ✕
          </button>
        )}
        {carreras.length > 0 && (
          <button
            type="button"
            onClick={() => exportarCSV(carreras)}
            className="px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            ↓ CSV
          </button>
        )}
      </form>

      {carreras.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          <span className="text-xs text-gray-400">Ordenar:</span>
          {([
            { key: 'nombre', label: 'Nombre' },
            { key: 'd1', label: 'D1 Riesgo' },
            { key: 'd2', label: 'D2 Oportunidad' },
            { key: 'matricula', label: 'Matrícula' },
          ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                sortKey === key ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {label}{sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
          {sortKey !== 'none' && (
            <button onClick={() => setSortKey('none')} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
              Limpiar
            </button>
          )}
          <span className="ml-2 text-xs text-gray-300">|</span>
          <button
            onClick={() => setFilterUrgenciaAlta(v => !v)}
            title="Mostrar solo carreras con urgencia curricular ≥ 60"
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${filterUrgenciaAlta ? 'bg-red-50 border-red-300 text-red-700 font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            U ≥ 60
          </button>
        </div>
      )}

      {loading && carreras.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>
      )}
      {!loading && carreras.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">Sin resultados{query ? ` para "${query}"` : ''}.</p>
      )}

      <div className="bg-white rounded-xl border shadow-sm divide-y">
        {sorted.map(c => (
          <div key={c.id} className="px-5 py-4 hover:bg-gray-50 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Link href={`/carreras/${c.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-700 hover:underline">
                {c.nombre}
              </Link>
              <div className="flex gap-2 items-center mt-0.5 flex-wrap">
                {c.area_conocimiento && (
                  <span className="text-xs text-indigo-500">{c.area_conocimiento}</span>
                )}
                {c.matricula != null && (
                  <span className="text-xs text-gray-400">{c.matricula.toLocaleString()} estudiantes</span>
                )}
                {c.benchmark_slug && (
                  <Link href={`/benchmarks/${c.benchmark_slug}`}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    Benchmark →
                  </Link>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end shrink-0 items-center">
              {c.benchmark_slug && benchmarkMap.has(c.benchmark_slug) && (() => {
                const u = benchmarkMap.get(c.benchmark_slug!)!
                const cls = u >= 60 ? 'bg-red-50 text-red-700' : u >= 30 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                return (
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${cls}`} title="Urgencia curricular (benchmarks internacionales)">
                    U {u}
                  </span>
                )
              })()}
              {c.kpi && (
                <>
                  <ScoreBadge label="D1" score={c.kpi.d1_obsolescencia.score} invert />
                  <ScoreBadge label="D2" score={c.kpi.d2_oportunidades.score} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => cargar(query, areaFiltro, skip, true)}
            className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Cargar más
          </button>
        </div>
      )}
      {loading && carreras.length > 0 && (
        <p className="text-center text-gray-400 text-xs mt-3">Cargando...</p>
      )}
    </div>
  )
}
