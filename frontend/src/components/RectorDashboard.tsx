'use client'
import { useEffect, useState } from 'react'
import { getRectorData } from '@/lib/api'
import type { RectorData } from '@/lib/types'
import AlertasPanel from './AlertasPanel'
import RectorCarrerasTable from './RectorCarrerasTable'

export default function RectorDashboard({ iesId }: { iesId: string }) {
  const [data, setData] = useState<RectorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          <RectorCarrerasTable carreras={data.carreras} />
        </main>
      </div>
    </div>
  )
}
