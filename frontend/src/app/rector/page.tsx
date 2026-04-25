'use client'
import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import RectorDashboard from '@/components/RectorDashboard'
import { getStoredIesId } from '@/lib/auth'

function RectorContent() {
  const params = useSearchParams()
  const router = useRouter()
  const iesIdParam = params.get('ies_id')
  const iesId = iesIdParam ?? getStoredIesId()

  useEffect(() => {
    if (iesId && !iesIdParam) {
      router.replace(`/rector?ies_id=${iesId}`)
    }
  }, [iesId, iesIdParam, router])

  if (!iesId) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 text-sm mb-4">Acceso restringido a rectores autenticados.</p>
        <Link
          href="/login"
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          Iniciar sesión →
        </Link>
      </div>
    )
  }

  return <RectorDashboard iesId={iesId} />
}

export default function RectorPage() {
  return (
    <Suspense fallback={<div className="py-8 text-gray-400 text-sm">Cargando...</div>}>
      <RectorContent />
    </Suspense>
  )
}
