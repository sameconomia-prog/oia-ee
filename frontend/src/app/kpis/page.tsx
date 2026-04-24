'use client'
import { useState } from 'react'
import KpisTable from '@/components/KpisTable'
import EstadoKpiSection from '@/components/EstadoKpiSection'
import NoticiasKpiSection from '@/components/NoticiasKpiSection'

type Tab = 'carreras' | 'estado' | 'noticias'

export default function KpisPage() {
  const [tab, setTab] = useState<Tab>('carreras')

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">KPIs del Observatorio</h1>
      <div className="flex gap-4 mb-4 border-b">
        {([
          { key: 'carreras', label: 'D1–D3–D6 por Carrera' },
          { key: 'estado', label: 'D5 Geografía por Estado' },
          { key: 'noticias', label: 'D7 Noticias (Global)' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`pb-2 text-sm ${tab === key ? 'border-b-2 border-blue-600 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'carreras' && <KpisTable />}
      {tab === 'estado' && <EstadoKpiSection />}
      {tab === 'noticias' && <NoticiasKpiSection />}
    </div>
  )
}
