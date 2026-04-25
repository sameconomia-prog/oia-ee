'use client'
import { useState } from 'react'
import CarrerasRankingD1 from './CarrerasRankingD1'
import CarrerasRankingD2 from './CarrerasRankingD2'

type Dim = 'd1' | 'd2'

const DIMS: { key: Dim; label: string; sub: string }[] = [
  { key: 'd1', label: 'D1 Obsolescencia', sub: 'Mayor score = mayor riesgo' },
  { key: 'd2', label: 'D2 Oportunidades', sub: 'Mayor score = mayor potencial' },
]

export default function CarrerasRankingPanel() {
  const [dim, setDim] = useState<Dim>('d1')

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {DIMS.map(d => (
          <button
            key={d.key}
            onClick={() => setDim(d.key)}
            className={`flex flex-col items-start px-4 py-2 rounded border text-left transition-colors ${
              dim === d.key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-semibold">{d.label}</span>
            <span className="text-xs text-gray-400">{d.sub}</span>
          </button>
        ))}
      </div>
      {dim === 'd1' ? <CarrerasRankingD1 /> : <CarrerasRankingD2 />}
    </div>
  )
}
