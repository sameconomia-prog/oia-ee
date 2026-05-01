'use client'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getIesPublico } from '@/lib/api'
import type { IesInfo } from '@/lib/types'

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

  const filtradas = busqueda.trim()
    ? iesList.filter(i =>
        i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (i.nombre_corto ?? '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : iesList

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
            {(ies.total_carreras ?? 0) > 0 && (
              <p className="text-xs text-indigo-500 mt-1">{ies.total_carreras} carrera{(ies.total_carreras ?? 0) !== 1 ? 's' : ''}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
