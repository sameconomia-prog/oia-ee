'use client'
import { useState } from 'react'
import { getKpisEstado } from '@/lib/api'
import type { D5Result } from '@/lib/types'

const ESTADOS_MX = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas',
  'Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Guanajuato',
  'Guerrero','Hidalgo','Jalisco','Estado de México','Michoacán','Morelos',
  'Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo',
  'San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas',
]

type EstadoScore = { estado: string; d5: D5Result }

function scoreBadgeClass(s: number) {
  return s >= 0.6
    ? 'text-green-700 bg-green-50'
    : s >= 0.4
    ? 'text-yellow-700 bg-yellow-50'
    : 'text-red-700 bg-red-50'
}

export default function EstadoRankingNacional() {
  const [datos, setDatos] = useState<EstadoScore[]>([])
  const [loading, setLoading] = useState(false)
  const [cargados, setCargados] = useState(0)

  async function cargarTodos() {
    setLoading(true)
    setCargados(0)
    setDatos([])

    const resultados: EstadoScore[] = []
    let count = 0

    await Promise.allSettled(
      ESTADOS_MX.map(async (estado) => {
        try {
          const r = await getKpisEstado(estado)
          resultados.push({ estado, d5: r.d5_geografia })
        } catch {
          // omitir estados fallidos
        } finally {
          count += 1
          setCargados(count)
        }
      })
    )

    setDatos([...resultados].sort((a, b) => b.d5.score - a.d5.score))
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={cargarTodos}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? `Cargando... ${cargados}/32`
            : datos.length > 0
            ? 'Actualizar ranking'
            : 'Cargar ranking nacional'}
        </button>
        {datos.length > 0 && !loading && (
          <span className="text-xs text-gray-400">{datos.length} estados · ordenado por D5 Score</span>
        )}
      </div>

      {datos.length > 0 && (
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left w-8">#</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-center">D5 Score</th>
                <th className="px-4 py-2 text-center">IDR ↓</th>
                <th className="px-4 py-2 text-center">ICG ↑</th>
                <th className="px-4 py-2 text-center">IES-S ↑</th>
              </tr>
            </thead>
            <tbody>
              {datos.map(({ estado, d5 }, i) => (
                <tr key={estado} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-700">{estado}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${scoreBadgeClass(d5.score)}`}>
                      {d5.score.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center font-mono text-xs text-gray-600">{d5.idr.toFixed(3)}</td>
                  <td className="px-4 py-2 text-center font-mono text-xs text-gray-600">{d5.icg.toFixed(3)}</td>
                  <td className="px-4 py-2 text-center font-mono text-xs text-gray-600">{d5.ies_s.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-2 bg-gray-50 border-t">
            D5 Geografía · ↓ IDR: menor=mejor · ↑ ICG, IES-S: mayor=mejor
          </p>
        </div>
      )}
    </div>
  )
}
