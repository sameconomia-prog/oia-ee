'use client'
import { useState } from 'react'
import CarrerasRankingD1 from './CarrerasRankingD1'
import CarrerasRankingD2 from './CarrerasRankingD2'
import CarrerasRankingD3 from './CarrerasRankingD3'
import CarrerasRankingD6 from './CarrerasRankingD6'

type Dim = 'd1' | 'd2' | 'd3' | 'd6'

const DIMS: { key: Dim; label: string; sub: string }[] = [
  { key: 'd1', label: 'D1 Obsolescencia', sub: 'Mayor score = mayor riesgo' },
  { key: 'd2', label: 'D2 Oportunidades', sub: 'Mayor score = mayor potencial' },
  { key: 'd3', label: 'D3 Mercado Laboral', sub: 'Mayor score = mayor relevancia' },
  { key: 'd6', label: 'D6 Perfil Estudiantil', sub: 'Mayor score = mayor retorno' },
]

export default function CarrerasRankingPanel() {
  const [dim, setDim] = useState<Dim>('d1')
  const [filterQuery, setFilterQuery] = useState('')

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
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
        <div className="ml-auto flex items-center">
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filtrar carrera..."
            className="border rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="ml-1 text-gray-400 hover:text-gray-700 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {dim === 'd1' && <CarrerasRankingD1 filterQuery={filterQuery} />}
      {dim === 'd2' && <CarrerasRankingD2 filterQuery={filterQuery} />}
      {dim === 'd3' && <CarrerasRankingD3 filterQuery={filterQuery} />}
      {dim === 'd6' && <CarrerasRankingD6 filterQuery={filterQuery} />}
    </div>
  )
}
