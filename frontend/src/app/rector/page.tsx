'use client'
import { useSearchParams } from 'next/navigation'
import RectorDashboard from '@/components/RectorDashboard'

export default function RectorPage() {
  const params = useSearchParams()
  const iesId = params.get('ies_id')

  if (!iesId) {
    return (
      <div className="py-8 text-gray-400 text-sm">
        Selecciona una IES para continuar. Ejemplo:{' '}
        <code className="bg-gray-100 px-1 rounded">/rector?ies_id=1</code>
      </div>
    )
  }

  return <RectorDashboard iesId={Number(iesId)} />
}
