'use client'
import type { EscenarioHistorial } from '@/lib/types'

interface Props {
  escenarios: EscenarioHistorial[]
  onClose: () => void
}

export default function ComparacionModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6">
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}
