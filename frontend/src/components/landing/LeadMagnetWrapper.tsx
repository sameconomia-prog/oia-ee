'use client'
import { useState } from 'react'
import LeadMagnetModal from './LeadMagnetModal'

interface Props {
  pdfUrl: string
  titulo: string
}

export default function LeadMagnetWrapper({ pdfUrl, titulo }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-center justify-between mb-8">
        <div>
          <p className="font-semibold text-gray-900">Disponible en PDF</p>
          <p className="text-sm text-gray-500">Versión completa con tablas y metodología detallada</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-[#1D4ED8] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          Descargar PDF →
        </button>
      </div>
      <LeadMagnetModal isOpen={open} onClose={() => setOpen(false)} pdfUrl={pdfUrl} titulo={titulo} />
    </>
  )
}
