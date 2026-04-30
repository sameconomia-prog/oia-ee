'use client'
import { useState } from 'react'

interface LeadMagnetModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  titulo: string
}

export default function LeadMagnetModal({ isOpen, onClose, pdfUrl, titulo }: LeadMagnetModalProps) {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviado(true)
    // Guardar lead en backend (best-effort, no bloquea la descarga)
    fetch('/api/lead-magnet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, titulo }),
    }).catch(() => {})
    setTimeout(() => {
      window.open(pdfUrl, '_blank')
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-gray-900 text-lg leading-snug pr-4">{titulo}</h3>
          <button
            onClick={onClose}
            aria-label="cerrar"
            className="text-gray-400 hover:text-gray-600 text-xl flex-shrink-0"
          >
            ✕
          </button>
        </div>
        <p className="text-gray-600 text-sm mb-6">
          Ingresa tu email institucional para descargar el PDF de forma gratuita.
        </p>
        {enviado ? (
          <p className="text-green-700 font-medium text-center py-4">✅ Preparando tu descarga...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="lead-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email institucional
              </label>
              <input
                id="lead-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@universidad.edu.mx"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Descargar PDF →
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
