'use client'
import type { EscenarioHistorial } from '@/lib/types'

interface Props {
  escenarios: EscenarioHistorial[]
  onClose: () => void
}

const METRICS = [
  { key: 'd1_score', label: 'D1 Obsolescencia', isD1: true },
  { key: 'd2_score', label: 'D2 Oportunidades', isD1: false },
  { key: 'iva', label: 'IVA', isD1: true },
  { key: 'bes', label: 'BES', isD1: true },
  { key: 'vac', label: 'VAC', isD1: true },
  { key: 'ioe', label: 'IOE', isD1: false },
  { key: 'ihe', label: 'IHE', isD1: false },
  { key: 'iea', label: 'IEA', isD1: false },
] as const

function colorValue(value: number, isD1: boolean) {
  const good = isD1 ? value < 0.4 : value >= 0.7
  const bad = isD1 ? value >= 0.7 : value < 0.4
  if (good) return 'text-green-700 font-semibold'
  if (bad) return 'text-red-600 font-semibold'
  return 'text-yellow-700'
}

export default function ComparacionModal({ escenarios, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-800">Comparación de Escenarios</h3>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray-500 border-b">Métrica</th>
                {escenarios.map((e) => (
                  <th key={e.id} className="px-3 py-2 text-center text-xs font-medium text-gray-800 border-b">
                    {e.carrera_nombre}
                    <div className="text-gray-400 font-normal">{new Date(e.fecha).toLocaleDateString('es-MX')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(({ key, label, isD1 }) => (
                <tr key={key} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-600">{label}</td>
                  {escenarios.map((e) => {
                    const val = e[key]
                    return (
                      <td key={e.id} className={`px-3 py-2 text-center text-xs ${colorValue(val, isD1)}`}>
                        {val.toFixed(3)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="text-sm px-4 py-1.5 border rounded hover:bg-gray-50 text-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
