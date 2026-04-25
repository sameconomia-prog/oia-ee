'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getCarrerasPublico } from '@/lib/api'
import type { CarreraKpi } from '@/lib/types'

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
  const [carreras, setCarreras] = useState<CarreraKpi[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const cargar = useCallback((q: string, newSkip: number, append: boolean) => {
    setLoading(true)
    getCarrerasPublico({ q: q || undefined, skip: newSkip, limit: PAGE_SIZE })
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
    cargar(query, 0, false)
  }, [query, cargar])

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
        {query && (
          <button
            type="button"
            onClick={() => { setBusqueda(''); setQuery('') }}
            className="px-3 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50"
          >
            ✕
          </button>
        )}
      </form>

      {loading && carreras.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>
      )}
      {!loading && carreras.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">Sin resultados{query ? ` para "${query}"` : ''}.</p>
      )}

      <div className="bg-white rounded-xl border shadow-sm divide-y">
        {carreras.map(c => (
          <div key={c.id} className="px-5 py-4 hover:bg-gray-50 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Link href={`/carreras/${c.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-700 hover:underline">
                {c.nombre}
              </Link>
              {c.matricula != null && (
                <p className="text-xs text-gray-400 mt-0.5">{c.matricula.toLocaleString()} estudiantes</p>
              )}
            </div>
            {c.kpi && (
              <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
                <ScoreBadge label="D1" score={c.kpi.d1_obsolescencia.score} invert />
                <ScoreBadge label="D2" score={c.kpi.d2_oportunidades.score} />
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => cargar(query, skip, true)}
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
