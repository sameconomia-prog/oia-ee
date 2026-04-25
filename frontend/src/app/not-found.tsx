import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-xl font-semibold text-gray-700 mb-2">Página no encontrada</h1>
      <p className="text-sm text-gray-400 mb-6">La ruta que buscas no existe en el observatorio.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
      >
        ← Volver al inicio
      </Link>
    </div>
  )
}
