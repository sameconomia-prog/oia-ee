'use client'
import { useEffect, useState } from 'react'
import { getNoticias } from '@/lib/api'
import type { Noticia } from '@/lib/types'

const PAGE_SIZE = 20

const SECTOR_BADGE: Record<string, string> = {
  tecnologia: 'bg-blue-100 text-blue-800',
  educacion: 'bg-green-100 text-green-800',
  logistica: 'bg-yellow-100 text-yellow-800',
  finanzas: 'bg-purple-100 text-purple-800',
}

const IMPACTO_BADGE: Record<string, string> = {
  riesgo: 'bg-red-100 text-red-800',
  oportunidad: 'bg-green-100 text-green-800',
  neutro: 'bg-yellow-100 text-yellow-800',
}

function badge(map: Record<string, string>, key: string | null): string {
  if (!key) return 'bg-gray-100 text-gray-600'
  return map[key.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function NoticiasTable() {
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [sector, setSector] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getNoticias({ skip: page * PAGE_SIZE, limit: PAGE_SIZE, sector: sector || undefined })
      .then(setNoticias)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sector, page])

  const filtered = search
    ? noticias.filter((n) => n.titulo.toLowerCase().includes(search.toLowerCase()))
    : noticias

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          className="border rounded px-3 py-1.5 text-sm flex-1"
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1.5 text-sm"
          value={sector}
          onChange={(e) => { setSector(e.target.value); setPage(0) }}
        >
          <option value="">Todos los sectores</option>
          <option value="tecnologia">Tecnología</option>
          <option value="educacion">Educación</option>
          <option value="logistica">Logística</option>
          <option value="finanzas">Finanzas</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">Error: {error}</p>}

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-2 border-b">Título</th>
              <th className="px-4 py-2 border-b">Sector</th>
              <th className="px-4 py-2 border-b">Impacto</th>
              <th className="px-4 py-2 border-b">País</th>
              <th className="px-4 py-2 border-b">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((n) => (
                <tr key={n.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 max-w-xs">
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-gray-900"
                    >
                      {n.titulo.length > 80 ? n.titulo.slice(0, 80) + '…' : n.titulo}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    {n.sector && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${badge(SECTOR_BADGE, n.sector)}`}
                      >
                        {n.sector}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {n.tipo_impacto && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${badge(IMPACTO_BADGE, n.tipo_impacto)}`}
                      >
                        {n.tipo_impacto}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{n.pais ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {formatDate(n.fecha_pub)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <button
          className="px-3 py-1 text-sm border rounded disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          ← Anterior
        </button>
        <span className="px-3 py-1 text-sm text-gray-500">Página {page + 1}</span>
        <button
          className="px-3 py-1 text-sm border rounded disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
          disabled={filtered.length < PAGE_SIZE}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
