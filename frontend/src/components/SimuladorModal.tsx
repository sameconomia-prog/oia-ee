'use client'
import { useState } from 'react'
import type { CarreraKpi, SimResult } from '@/lib/types'
import { calcD1, calcD2 } from '@/lib/kpi-colors'
import { postSimular } from '@/lib/api'

function arrowColor(projected: number, actual: number | undefined, isD1: boolean): string {
  if (actual === undefined) return 'text-gray-400'
  const improved = isD1 ? projected < actual : projected > actual
  const worsened = isD1 ? projected > actual : projected < actual
  if (improved) return 'text-green-600'
  if (worsened) return 'text-red-600'
  return 'text-gray-400'
}

export default function SimuladorModal({
  carrera,
  iesId,
  onClose,
}: {
  carrera: CarreraKpi
  iesId: string
  onClose: () => void
}) {
  const kpi = carrera.kpi
  const [iva, setIva] = useState(kpi?.d1_obsolescencia.iva ?? 0.5)
  const [bes, setBes] = useState(kpi?.d1_obsolescencia.bes ?? 0.5)
  const [vac, setVac] = useState(kpi?.d1_obsolescencia.vac ?? 0.5)
  const [ioe, setIoe] = useState(kpi?.d2_oportunidades.ioe ?? 0.5)
  const [ihe, setIhe] = useState(kpi?.d2_oportunidades.ihe ?? 0.5)
  const [iea, setIea] = useState(kpi?.d2_oportunidades.iea ?? 0.5)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<SimResult | null>(null)

  const d1Actual = kpi?.d1_obsolescencia.score
  const d2Actual = kpi?.d2_oportunidades.score
  const d1Projected = calcD1(iva, bes, vac)
  const d2Projected = calcD2(ioe, ihe, iea)

  const inputs = [
    { label: 'IVA', value: iva, set: setIva },
    { label: 'BES', value: bes, set: setBes },
    { label: 'VAC', value: vac, set: setVac },
    { label: 'IOE', value: ioe, set: setIoe },
    { label: 'IHE', value: ihe, set: setIhe },
    { label: 'IEA', value: iea, set: setIea },
  ]

  async function handleSave() {
    setSaving(true)
    try {
      const result = await postSimular({
        ies_id: iesId,
        carrera_id: carrera.id,
        carrera_nombre: carrera.nombre,
        iva, bes, vac, ioe, ihe, iea,
      })
      setSaved(result)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Simular escenario — {carrera.nombre}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {inputs.map(({ label, value, set }) => (
            <div key={label}>
              <label
                className="block text-xs text-gray-500 mb-1"
                htmlFor={`sim-${label}`}
              >
                {label}
              </label>
              <input
                id={`sim-${label}`}
                aria-label={label}
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={value}
                onChange={(e) => set(parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded p-3 text-xs space-y-1 mb-4">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">D1 actual:</span>
            <span className="font-mono">{d1Actual?.toFixed(4) ?? '—'}</span>
            <span className={arrowColor(d1Projected, d1Actual, true)}>→</span>
            <span className="font-mono font-semibold">
              D1 proyectado: {d1Projected.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">D2 actual:</span>
            <span className="font-mono">{d2Actual?.toFixed(4) ?? '—'}</span>
            <span className={arrowColor(d2Projected, d2Actual, false)}>→</span>
            <span className="font-mono font-semibold">
              D2 proyectado: {d2Projected.toFixed(4)}
            </span>
          </div>
        </div>

        {saved && (
          <p className="text-xs text-green-600 mb-3">Escenario guardado ✓</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border rounded"
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar escenario'}
          </button>
        </div>
      </div>
    </div>
  )
}
