'use client'
import { useState, useEffect } from 'react'
import { getKpisIes } from '@/lib/api'
import type { D4Result } from '@/lib/types'

const METRICAS: { key: keyof D4Result; label: string; titulo: string; invert: boolean }[] = [
  { key: 'score', label: 'Score D4', titulo: 'Score general institucional', invert: false },
  { key: 'tra', label: 'TRA — Retención', titulo: 'Tasa Retención-Absorción', invert: false },
  { key: 'irf', label: 'IRF — Riesgo Fin.', titulo: 'Índice Riesgo Financiero (menor=mejor)', invert: true },
  { key: 'cad', label: 'CAD — Actualización', titulo: 'Cobertura Actualización Digital', invert: false },
]

function gana(a: number, b: number, invert: boolean): 'a' | 'b' | 'empate' {
  const diff = Math.abs(a - b)
  if (diff < 0.001) return 'empate'
  if (invert) return a < b ? 'a' : 'b'
  return a > b ? 'a' : 'b'
}

export default function ComparacionIES({
  iesAId, iesBId, iesANombre, iesBNombre,
}: {
  iesAId: string
  iesBId: string
  iesANombre: string
  iesBNombre: string
}) {
  const [d4A, setD4A] = useState<D4Result | null>(null)
  const [d4B, setD4B] = useState<D4Result | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setD4A(null)
    setD4B(null)
    Promise.all([getKpisIes(iesAId), getKpisIes(iesBId)])
      .then(([resA, resB]) => {
        setD4A(resA?.d4_institucional ?? null)
        setD4B(resB?.d4_institucional ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [iesAId, iesBId])

  if (loading) return <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
  if (!d4A || !d4B) return <p className="text-sm text-red-400 text-center py-8">Error cargando datos.</p>

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-3 bg-gray-800 text-white text-sm font-semibold">
        <div className="px-4 py-3">Métrica</div>
        <div className="px-4 py-3 text-center border-l border-gray-700 truncate" title={iesANombre}>
          {iesANombre}
        </div>
        <div className="px-4 py-3 text-center border-l border-gray-700 truncate" title={iesBNombre}>
          {iesBNombre}
        </div>
      </div>

      {METRICAS.map(({ key, label, titulo, invert }) => {
        const vA = d4A[key]
        const vB = d4B[key]
        const ganador = gana(vA, vB, invert)
        const bgA = ganador === 'a' ? 'bg-green-50 font-bold text-green-800' : 'text-gray-700'
        const bgB = ganador === 'b' ? 'bg-green-50 font-bold text-green-800' : 'text-gray-700'
        return (
          <div key={key} className="grid grid-cols-3 border-t text-sm">
            <div className="px-4 py-3 text-gray-500 text-xs" title={titulo}>{label}</div>
            <div className={`px-4 py-3 text-center border-l font-mono ${bgA}`}>
              {vA.toFixed(2)}{ganador === 'a' && ' ✓'}
            </div>
            <div className={`px-4 py-3 text-center border-l font-mono ${bgB}`}>
              {vB.toFixed(2)}{ganador === 'b' && ' ✓'}
            </div>
          </div>
        )
      })}

      <p className="text-xs text-gray-400 px-4 py-2 bg-gray-50 border-t">
        D4 Institucional · ✓ indica mejor valor · IRF: menor es mejor
      </p>
    </div>
  )
}
