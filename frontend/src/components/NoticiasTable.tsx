'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getNoticias, buscarNoticias, getSectoresNoticias } from '@/lib/api'
import type { Noticia } from '@/lib/types'

function exportarCSVNoticias(noticias: Noticia[]) {
  const headers = ['Titulo', 'Fuente', 'Sector', 'Impacto', 'Pais', 'Empresa', 'Empleados', 'Fecha Pub', 'URL']
  const rows = noticias.map(n => [
    n.titulo, n.fuente ?? '', n.sector ?? '', n.tipo_impacto ?? '',
    n.pais ?? '', n.empresa ?? '', n.n_empleados ?? '', n.fecha_pub ?? '', n.url,
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `noticias_ia_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function NoticiasTable() {
  const searchParams = useSearchParams()
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [sector, setSector] = useState(() => searchParams.get('sector') ?? '')
  const [impacto, setImpacto] = useState(() => searchParams.get('impacto') ?? '')
  const [sectoresDisponibles, setSectoresDisponibles] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [queryActiva, setQueryActiva] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSectoresNoticias().then(setSectoresDisponibles).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const fn = queryActiva
      ? buscarNoticias(queryActiva, 20)
      : getNoticias({ skip: page * PAGE_SIZE, limit: PAGE_SIZE, sector: sector || undefined, impacto: impacto || undefined })
    fn
      .then(setNoticias)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sector, impacto, page, queryActiva])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    setQueryActiva(query.trim())
  }

  function clearSearch() {
    setQuery('')
    setQueryActiva('')
    setPage(0)
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input
            className="border rounded px-3 py-1.5 text-sm w-full pr-8"
            placeholder="Búsqueda semántica — presiona Enter..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {queryActiva && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <button type="submit" className="px-3 py-1.5 text-sm border rounded bg-gray-50 hover:bg-gray-100">
          Buscar
        </button>
        {!queryActiva && (
          <select
            className="border rounded px-2 py-1.5 text-sm"
            value={impacto}
            onChange={(e) => { setImpacto(e.target.value); setPage(0) }}
          >
            <option value="">Todo impacto</option>
            <option value="riesgo">Riesgo</option>
            <option value="oportunidad">Oportunidad</option>
            <option value="neutro">Neutro</option>
          </select>
        )}
        {!queryActiva && (
          <select
            className="border rounded px-2 py-1.5 text-sm"
            value={sector}
            onChange={(e) => { setSector(e.target.value); setPage(0) }}
          >
            <option value="">Todos los sectores</option>
            {sectoresDisponibles.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        {queryActiva && (
          <span className="px-2 py-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded self-center">
            Semántica: "{queryActiva}"
          </span>
        )}
      </form>

      {noticias.length > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => exportarCSVNoticias(noticias)}
            className="text-xs px-3 py-1.5 border rounded hover:bg-gray-50 text-gray-600 transition-colors"
          >
            ↓ Exportar CSV
          </button>
        </div>
      )}

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
            {!loading && noticias.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {!loading &&
              noticias.map((n) => (
                <tr key={n.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 max-w-xs">
                    <Link href={`/noticias/${n.id}`} className="hover:underline text-gray-900">
                      {n.titulo.length > 80 ? n.titulo.slice(0, 80) + '…' : n.titulo}
                    </Link>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-gray-400 hover:text-indigo-600 text-xs"
                      title="Abrir fuente"
                    >
                      ↗
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

      {!queryActiva && (
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
            disabled={noticias.length < PAGE_SIZE}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
