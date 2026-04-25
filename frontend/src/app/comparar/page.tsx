'use client'
import { useState, useEffect } from 'react'
import { getPublicoIes } from '@/lib/api'
import ComparacionIES from '@/components/ComparacionIES'

type IesOpcion = { id: string; nombre: string; nombre_corto?: string }

export default function CompararPage() {
  const [ies, setIes] = useState<IesOpcion[]>([])
  const [iesAId, setIesAId] = useState('')
  const [iesBId, setIesBId] = useState('')

  useEffect(() => {
    getPublicoIes().then(setIes).catch(() => setIes([]))
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Comparar Instituciones</h1>
      <p className="text-sm text-gray-500 mb-6">
        Compara el índice D4 institucional entre dos IES.
      </p>

      <div className="flex gap-4 mb-8">
        {(['A', 'B'] as const).map((letra, i) => {
          const val = i === 0 ? iesAId : iesBId
          const set = i === 0 ? setIesAId : setIesBId
          return (
            <div key={letra} className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">IES {letra}</label>
              <select
                value={val}
                onChange={e => set(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Seleccionar —</option>
                {ies.map(op => (
                  <option key={op.id} value={op.id}>{op.nombre_corto ?? op.nombre}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {iesAId && iesBId && iesAId !== iesBId ? (
        <ComparacionIES
          iesAId={iesAId}
          iesBId={iesBId}
          iesANombre={ies.find(i => i.id === iesAId)?.nombre ?? iesAId}
          iesBNombre={ies.find(i => i.id === iesBId)?.nombre ?? iesBId}
        />
      ) : (
        <p className="text-sm text-gray-400 text-center py-12">
          Selecciona dos instituciones distintas para comparar.
        </p>
      )}
    </div>
  )
}
