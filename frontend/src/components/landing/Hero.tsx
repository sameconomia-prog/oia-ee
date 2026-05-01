'use client'
import { useState } from 'react'
import Link from 'next/link'
import LeadMagnetModal from './LeadMagnetModal'

interface HeroProps {
  totalIes: number
  totalCarreras: number
}

export default function Hero({ totalIes, totalCarreras }: HeroProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="bg-[#F8FAFC] pt-16 pb-20 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-[#1D4ED8] font-semibold text-sm uppercase tracking-wide mb-4">
            Observatorio de Impacto IA · México 2026
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
            {totalIes} IES analizadas.{' '}
            {totalCarreras.toLocaleString('es-MX')} carreras monitoreadas.{' '}
            <span className="text-[#1D4ED8]">¿Cómo está la tuya?</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            OIA-EE monitorea instituciones, carreras y vacantes para anticipar
            qué programas necesitan adaptarse ante la IA — y cuáles ya perdieron la carrera.
          </p>
          <form action="/ies" method="get" className="mb-6 max-w-sm">
            <div className="flex gap-2">
              <input
                type="text"
                name="q"
                placeholder="Busca tu institución…"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#1D4ED8] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Buscar
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Busca por nombre de universidad o siglas</p>
          </form>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#1D4ED8] text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Descargar Reporte 2026 →
            </button>
            <Link
              href="#contacto"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-[#1D4ED8] text-[#1D4ED8] font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Solicitar análisis de mi institución
            </Link>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <div className="relative">
            <div className="w-64 h-80 bg-[#1D4ED8] rounded-lg shadow-xl flex flex-col items-center justify-center text-white p-6">
              <p className="text-xs uppercase tracking-widest opacity-70 mb-2">OIA-EE</p>
              <p className="text-xl font-bold text-center leading-tight mb-4">
                Impacto de la IA en la Educación Superior de México
              </p>
              <div className="border-t border-blue-300 w-full pt-4 text-center">
                <p className="text-sm opacity-80">Primera Edición</p>
                <p className="text-2xl font-bold">2026</p>
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 bg-white border border-gray-200 rounded-lg px-3 py-1 shadow-sm">
              <p className="text-xs text-gray-500">PDF gratuito</p>
            </div>
          </div>
        </div>
      </div>

      <LeadMagnetModal
        isOpen={open}
        onClose={() => setOpen(false)}
        pdfUrl="/pdfs/oia-ee-reporte-2026.pdf"
        titulo="Reporte 2026 — Impacto IA en Educación Superior México"
      />
    </section>
  )
}
