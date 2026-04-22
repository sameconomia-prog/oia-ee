'use client'
import { useEffect, useState } from 'react'
import { getRectorData } from '@/lib/api'
import type { RectorData, EscenarioHistorial } from '@/lib/types'
import AlertasPanel from './AlertasPanel'
import RectorCarrerasTable from './RectorCarrerasTable'
import EscenariosPanel from './EscenariosPanel'
import ComparacionModal from './ComparacionModal'

type Tab = 'carreras' | 'escenarios'

export default function RectorDashboard({ iesId }: { iesId: string }) {
  const [data, setData] = useState<RectorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('carreras')
  const [comparando, setComparando] = useState<EscenarioHistorial[] | null>(null)

  useEffect(() => {
    getRectorData(iesId)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [iesId])

  if (loading) return <p className="text-gray-400 py-8">Cargando dashboard...</p>
  if (error) return <p className="text-red-500 py-8">Error: {error}</p>
  if (!data) return <p className="text-gray-400 py-8">Sin datos disponibles.</p>

  return (
    <div>
      {comparando && (
        <ComparacionModal escenarios={comparando} onClose={() => setComparando(null)} />
      )}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{data.ies.nombre}</h2>
        {data.ies.nombre_corto && (
          <p className="text-sm text-gray-500">{data.ies.nombre_corto}</p>
        )}
      </div>
      <div className="grid grid-cols-[280px_1fr] gap-4 items-start">
        <aside className="border rounded bg-white">
          <AlertasPanel alertas={data.alertas} iesId={iesId} />
        </aside>
        <main>
          <div className="flex gap-4 mb-3 border-b">
            {(['carreras', 'escenarios'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 text-sm capitalize ${tab === t ? 'border-b-2 border-blue-600 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t === 'carreras' ? 'Carreras' : 'Historial Escenarios'}
              </button>
            ))}
          </div>
          {tab === 'carreras' && <RectorCarrerasTable carreras={data.carreras} iesId={iesId} />}
          {tab === 'escenarios' && <EscenariosPanel iesId={iesId} onComparar={setComparando} />}
        </main>
      </div>
    </div>
  )
}
