import type { AccionCurricular } from '@/lib/types'

const CONFIG: Record<AccionCurricular, { label: string; bg: string; text: string }> = {
  retirar:    { label: 'Retirar',    bg: 'bg-red-100',   text: 'text-red-800'   },
  redisenar:  { label: 'Rediseñar',  bg: 'bg-amber-100', text: 'text-amber-800' },
  fortalecer: { label: 'Fortalecer', bg: 'bg-green-100', text: 'text-green-800' },
  agregar:    { label: 'Agregar',    bg: 'bg-blue-100',  text: 'text-blue-800'  },
}

export default function CurriculumBadge({ accion }: { accion: AccionCurricular }) {
  const { label, bg, text } = CONFIG[accion] ?? CONFIG.fortalecer
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}
