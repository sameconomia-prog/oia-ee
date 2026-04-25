'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl font-bold text-red-100 mb-4">Error</p>
      <h1 className="text-xl font-semibold text-gray-700 mb-2">Algo salió mal</h1>
      <p className="text-sm text-gray-400 mb-6 max-w-sm">{error.message || 'Ocurrió un error inesperado. Por favor intenta de nuevo.'}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}
