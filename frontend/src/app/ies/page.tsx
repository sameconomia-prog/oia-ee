'use client'
import { useEffect, useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getIesPublico } from '@/lib/api'
import type { IesInfo } from '@/lib/types'

type SortMode = 'default' | 'd1_desc' | 'd2_desc' | 'nombre'

export default function IesListPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Cargando…</div>}>
      <IesListContent />
    </Suspense>
  )
}

function IesListContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [iesList, setIesList] = useState<IesInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState(() => searchParams.get('q') ?? '')
  const [sortMode, setSortMode] = useState<SortMode>('default')

  function handleBusqueda(val: string) {
    setBusqueda(val)
    const params = new URLSearchParams(searchParams.toString())
    if (val) params.set('q', val)
    else params.delete('q')
    router.replace(`/ies${params.size ? `?${params}` : ''}`, { scroll: false })
  }

  useEffect(() => {
    getIesPublico()
      .then(setIesList)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtradas = useMemo(() => {
    let list = busqueda.trim()
      ? iesList.filter(i =>
          i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          (i.nombre_corto ?? '').toLowerCase().includes(busqueda.toLowerCase())
        )
      : [...iesList]
    if (sortMode === 'd1_desc') list.sort((a, b) => (b.promedio_d1 ?? -1) - (a.promedio_d1 ?? -1))
    if (sortMode === 'd2_desc') list.sort((a, b) => (b.promedio_d2 ?? -1) - (a.promedio_d2 ?? -1))
    if (sortMode === 'nombre') list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    return list
  }, [iesList, busqueda, sortMode])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-xs text-indigo-600 hover:underline">← Inicio</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Instituciones de Educación Superior</h1>
        <p className="text-sm text-gray-500 mt-1">
          {iesList.length} instituciones monitoreadas activamente
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={busqueda}
          onChange={e => handleBusqueda(e.target.value)}
          placeholder="Buscar institución..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        {busqueda && (
          <button onClick={() => handleBusqueda('')} className="text-xs text-gray-400 hover:text-gray-700">✕</button>
        )}
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap items-center">
        <span className="text-xs text-gray-400">Ordenar:</span>
        {([
          { key: 'default', label: 'Default' },
          { key: 'd1_desc', label: '↑ D1 Riesgo' },
          { key: 'd2_desc', label: '↑ D2 Oportunidad' },
          { key: 'nombre', label: 'Nombre A–Z' },
        ] as { key: SortMode; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortMode(key)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
              sortMode === key ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>
      )}

      {!loading && filtradas.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">Sin resultados.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtradas.map(ies => (
          <Link
            key={ies.id}
            href={`/ies/${ies.id}`}
            className="flex flex-col gap-0.5 p-4 bg-white rounded-xl border shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
          >
            <p className="font-semibold text-gray-800 text-sm">{ies.nombre}</p>
            {ies.nombre_corto && (
              <p className="text-xs text-gray-400">{ies.nombre_corto}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {(ies.total_carreras ?? 0) > 0 && (
                <span className="text-xs text-indigo-500">{ies.total_carreras} carrera{(ies.total_carreras ?? 0) !== 1 ? 's' : ''}</span>
              )}
              {ies.promedio_d1 != null && (
                <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${ies.promedio_d1 >= 0.6 ? 'bg-red-50 text-red-700' : ies.promedio_d1 >= 0.4 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                  D1 {ies.promedio_d1.toFixed(2)}
                </span>
              )}
              {ies.promedio_d2 != null && (
                <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${ies.promedio_d2 >= 0.6 ? 'bg-green-50 text-green-700' : ies.promedio_d2 >= 0.4 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                  D2 {ies.promedio_d2.toFixed(2)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
