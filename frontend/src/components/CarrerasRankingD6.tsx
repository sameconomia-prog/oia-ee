'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getCarrerasPublico } from '@/lib/api'
import type { CarreraKpi } from '@/lib/types'

type CarreraConD6 = { id: string; nombre: string; d6: { score: number; iei: number; crc: number; roi_e: number } }

function scoreBadgeClass(s: number) {
  return s >= 0.6
    ? 'text-green-700 bg-green-50'
    : s >= 0.4
    ? 'text-yellow-700 bg-yellow-50'
    : 'text-red-700 bg-red-50'
}

export default function CarrerasRankingD6({ filterQuery = '' }: { filterQuery?: string }) {
  const [raw, setRaw] = useState<CarreraKpi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCarrerasPublico({ limit: 500 })
      .then(setRaw)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const datos: CarreraConD6[] = useMemo(() => {
    return raw
      .filter((c): c is CarreraKpi & { kpi: NonNullable<CarreraKpi['kpi']> } => c.kpi !== null)
      .map(c => ({ id: c.id, nombre: c.nombre, d6: c.kpi.d6_estudiantil }))
      .sort((a, b) => b.d6.score - a.d6.score)
      .filter(d => !filterQuery || d.nombre.toLowerCase().includes(filterQuery.toLowerCase()))
  }, [raw, filterQuery])

  const stats = useMemo(() => {
    if (datos.length === 0) return null
    const scores = datos.map(d => d.d6.score)
    const promedio = scores.reduce((a, b) => a + b, 0) / scores.length
    const verde = scores.filter(s => s >= 0.6).length
    const amarillo = scores.filter(s => s >= 0.4 && s < 0.6).length
    const rojo = scores.filter(s => s < 0.4).length
    return { promedio, verde, amarillo, rojo, mayor: datos[0], menor: datos[datos.length - 1] }
  }, [datos])

  function exportarCSV() {
    if (datos.length === 0) return
    const header = '#,Carrera,D6 Score,IEI,CRC,ROI-E'
    const rows = datos.map(({ nombre, d6 }, i) =>
      `${i + 1},"${nombre}",${d6.score.toFixed(4)},${d6.iei.toFixed(4)},${d6.crc.toFixed(4)},${d6.roi_e.toFixed(4)}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fecha = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `ranking_d6_carreras_${fecha}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Cargando carreras...</p>
  if (error) return <p className="text-sm text-red-500 py-4">Error: {error}</p>
  if (datos.length === 0) return <p className="text-sm text-gray-400 py-8 text-center">Sin datos de carreras.</p>

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-400">{datos.length} carreras · ordenado por D6 Score (mayor retorno primero)</span>
        <button
          onClick={exportarCSV}
          className="ml-auto px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded border hover:bg-gray-200"
        >
          Exportar CSV
        </button>
      </div>

      {stats && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Promedio D6 nacional</p>
            <p className={`text-lg font-mono font-semibold ${stats.promedio >= 0.6 ? 'text-green-700' : stats.promedio >= 0.4 ? 'text-yellow-700' : 'text-red-700'}`}>
              {stats.promedio.toFixed(3)}
            </p>
          </div>
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">💰 Mejor ROI estudiantil</p>
            <p className="text-sm font-semibold text-green-700 truncate">{stats.mayor.nombre}</p>
            <p className="text-xs font-mono text-green-600">{stats.mayor.d6.score.toFixed(3)}</p>
          </div>
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Menor retorno</p>
            <p className="text-sm font-semibold text-red-700 truncate">{stats.menor.nombre}</p>
            <p className="text-xs font-mono text-red-600">{stats.menor.d6.score.toFixed(3)}</p>
          </div>
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2">Distribución</p>
            <div className="flex gap-2 text-xs">
              <span className="text-green-700 font-semibold">{stats.verde}🟢</span>
              <span className="text-yellow-700 font-semibold">{stats.amarillo}🟡</span>
              <span className="text-red-700 font-semibold">{stats.rojo}🔴</span>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left w-8">#</th>
              <th className="px-4 py-2 text-left">Carrera</th>
              <th className="px-4 py-2 text-center">D6 Score</th>
              <th className="px-4 py-2 text-center">IEI ↑</th>
              <th className="px-4 py-2 text-center">CRC ↑</th>
              <th className="px-4 py-2 text-center">ROI-E ↑</th>
            </tr>
          </thead>
          <tbody>
            {datos.map(({ id, nombre, d6 }, i) => (
              <tr key={id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-gray-700"><Link href={`/carreras/${id}`} className="hover:text-indigo-700 hover:underline">{nombre}</Link></td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${scoreBadgeClass(d6.score)}`}>
                    {d6.score.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2 text-center font-mono text-xs text-gray-600">{d6.iei.toFixed(3)}</td>
                <td className="px-4 py-2 text-center font-mono text-xs text-gray-600">{d6.crc.toFixed(3)}</td>
                <td className="px-4 py-2 text-center font-mono text-xs text-gray-600">{d6.roi_e.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 px-4 py-2 bg-gray-50 border-t">
          D6 Perfil Estudiantil · IEI: eficiencia inversión · CRC: retorno competencias · ROI-E: retorno inversión educativa
        </p>
      </div>
    </div>
  )
}
