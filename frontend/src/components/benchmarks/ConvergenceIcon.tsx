import type { ConvergenceDirection } from '@/lib/types'

const CONFIG: Record<ConvergenceDirection, { icon: string; color: string; label: string }> = {
  declining: { icon: '↓', color: '#EF4444', label: 'Declining' },
  growing:   { icon: '↑', color: '#10B981', label: 'Growing' },
  stable:    { icon: '→', color: '#6B7280', label: 'Stable' },
  mixed:     { icon: '◐', color: '#F59E0B', label: 'Mixed' },
  sin_datos: { icon: '—', color: '#9CA3AF', label: 'Sin datos' },
}

export default function ConvergenceIcon({ direction }: { direction: ConvergenceDirection }) {
  const { icon, color, label } = CONFIG[direction] ?? CONFIG.sin_datos
  return (
    <span
      style={{ color }}
      className="font-mono text-base font-bold"
      title={label}
      aria-label={label}
    >
      {icon}
    </span>
  )
}
