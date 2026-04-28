'use client'
import { useState } from 'react'
import CarrerasRanking, { DIM_CONFIGS } from './CarrerasRanking'

type Dim = 'D1' | 'D2' | 'D3' | 'D6'

const DIMS: { key: Dim; label: string; sub: string }[] = [
  { key: 'D1', label: 'D1 Obsolescencia', sub: 'Mayor score = mayor riesgo' },
  { key: 'D2', label: 'D2 Oportunidades', sub: 'Mayor score = mayor potencial' },
  { key: 'D3', label: 'D3 Mercado Laboral', sub: 'Mayor score = mayor relevancia' },
  { key: 'D6', label: 'D6 Perfil Estudiantil', sub: 'Mayor score = mayor retorno' },
]

export default function CarrerasRankingPanel() {
  const [dim, setDim] = useState<Dim>('D1')
  const [filterQuery, setFilterQuery] = useState('')

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {DIMS.map(d => (
          <button
            key={d.key}
            onClick={() => setDim(d.key)}
            className={`flex flex-col items-start px-4 py-2 rounded-lg border text-left transition-colors ${
              dim === d.key
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-sm font-semibold">{d.label}</span>
            <span className="text-xs text-slate-400">{d.sub}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center">
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filtrar carrera..."
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="ml-1 text-slate-400 hover:text-slate-700 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <CarrerasRanking config={DIM_CONFIGS[dim]} filterQuery={filterQuery} />
    </div>
  )
}
