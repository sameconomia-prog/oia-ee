'use client'
import { useEffect, useState } from 'react'
import { getCarrerasPublico } from '@/lib/api'
import type { CarreraKpi } from '@/lib/types'
import RiesgoOportunidadMatrix from './RiesgoOportunidadMatrix'

export default function MatrizKpiPublica() {
  const [carreras, setCarreras] = useState<CarreraKpi[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function load() {
    setLoading(true)
    const data = await getCarrerasPublico({ limit: 500 })
    setCarreras(data.filter(c => c.kpi))
    setLoading(false)
    setLoaded(true)
  }

  useEffect(() => { load() }, [])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando matriz...</p>

  if (!loaded) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Matriz Riesgo × Oportunidad</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {carreras.length} carreras · posición por D1 (riesgo) y D2 (oportunidad)
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Actualizar
        </button>
      </div>
      <RiesgoOportunidadMatrix carreras={carreras} />
    </div>
  )
}
