// frontend/src/app/kpis/page.tsx
'use client'
import { useState } from 'react'
import KpisTable from '@/components/KpisTable'
import EstadoKpiSection from '@/components/EstadoKpiSection'
import NoticiasKpiSection from '@/components/NoticiasKpiSection'
import EstadoRankingNacional from '@/components/EstadoRankingNacional'
import CarrerasRankingPanel from '@/components/CarrerasRankingPanel'

type Tab = 'carreras' | 'estado' | 'ranking_d5' | 'noticias' | 'ranking_carreras'

const TABS: { key: Tab; label: string }[] = [
  { key: 'carreras', label: 'D1–D3–D6 por Carrera' },
  { key: 'estado', label: 'D5 Geografía por Estado' },
  { key: 'ranking_d5', label: 'D5 Ranking Nacional' },
  { key: 'ranking_carreras', label: 'Ranking Carreras' },
  { key: 'noticias', label: 'D7 Noticias (Global)' },
]

export default function KpisPage() {
  const [tab, setTab] = useState<Tab>('carreras')

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-5">KPIs del Observatorio</h1>
      <div className="flex gap-1 mb-6 border-b border-slate-200 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`pb-2.5 px-3 text-sm border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-brand-600 text-brand-700 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'carreras' && <KpisTable />}
      {tab === 'estado' && <EstadoKpiSection />}
      {tab === 'ranking_d5' && <EstadoRankingNacional />}
      {tab === 'ranking_carreras' && <CarrerasRankingPanel />}
      {tab === 'noticias' && <NoticiasKpiSection />}
    </div>
  )
}
