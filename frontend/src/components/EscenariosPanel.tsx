'use client'
import { useEffect, useState } from 'react'
import { getEscenarios } from '@/lib/api'
import type { EscenarioHistorial } from '@/lib/types'

function ScoreCell({ value, isD1 }: { value: number; isD1: boolean }) {
  const color = isD1
    ? value >= 0.7 ? 'text-red-600' : value >= 0.4 ? 'text-yellow-600' : 'text-green-600'
    : value >= 0.7 ? 'text-green-600' : value >= 0.4 ? 'text-yellow-600' : 'text-red-600'
  return <span className={`font-mono text-xs ${color}`}>{value.toFixed(3)}</span>
}

interface Props {
  iesId: string
  onComparar: (selected: EscenarioHistorial[]) => void
}

export default function EscenariosPanel({ iesId, onComparar }: Props) {
  const [escenarios, setEscenarios] = useState<EscenarioHistorial[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [skip, setSkip] = useState(0)
  const limit = 10

  useEffect(() => {
    setSelected(new Set())
    setLoading(true)
    getEscenarios(iesId, { skip, limit })
      .then((r) => { setEscenarios(r.escenarios); setTotal(r.total) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [iesId, skip])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  function handleComparar() {
    const sel = escenarios.filter((e) => selected.has(e.id))
    onComparar(sel)
  }

  if (loading) return <p className="text-gray-400 py-4 text-sm">Cargando escenarios...</p>
  if (error) return <p className="text-red-500 py-4 text-sm">Error: {error}</p>
  if (escenarios.length === 0) return <p className="text-gray-400 py-4 text-sm">Sin escenarios guardados.</p>

  const totalPages = Math.ceil(total / limit)
  const page = Math.floor(skip / limit)

  return (
    <div>
      {selected.size >= 2 && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={handleComparar}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Comparar ({selected.size}) →
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded border text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-center">
              <th className="px-2 py-2 text-left w-4"></th>
              <th className="px-2 py-2 text-left">Carrera</th>
              <th className="px-2 py-2">D1</th>
              <th className="px-2 py-2">D2</th>
              <th className="px-2 py-2">IVA</th>
              <th className="px-2 py-2">BES</th>
              <th className="px-2 py-2">VAC</th>
              <th className="px-2 py-2">IOE</th>
              <th className="px-2 py-2">IHE</th>
              <th className="px-2 py-2">IEA</th>
              <th className="px-2 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {escenarios.map((e) => (
              <tr key={e.id} className={`border-b hover:bg-gray-50 text-center ${selected.has(e.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggleSelect(e.id)}
                    disabled={!selected.has(e.id) && selected.size >= 3}
                    aria-label={`Seleccionar ${e.carrera_nombre}`}
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-2 py-1.5 text-left font-medium text-gray-800">{e.carrera_nombre}</td>
                <td className="px-2 py-1.5"><ScoreCell value={e.d1_score} isD1={true} /></td>
                <td className="px-2 py-1.5"><ScoreCell value={e.d2_score} isD1={false} /></td>
                <td className="px-2 py-1.5 text-gray-500">{e.iva.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-500">{e.bes.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-500">{e.vac.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-500">{e.ioe.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-500">{e.ihe.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-500">{e.iea.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-400">{new Date(e.fecha).toLocaleDateString('es-MX')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <button onClick={() => { setSkip(Math.max(0, skip - limit)); setSelected(new Set()) }} disabled={page === 0} className="disabled:opacity-40">← Anterior</button>
          <span>Página {page + 1} de {totalPages} ({total} total)</span>
          <button onClick={() => { setSkip(skip + limit); setSelected(new Set()) }} disabled={page >= totalPages - 1} className="disabled:opacity-40">Siguiente →</button>
        </div>
      )}
    </div>
  )
}
