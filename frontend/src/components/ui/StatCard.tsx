// frontend/src/components/ui/StatCard.tsx
import { type ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  valueClassName?: string
  icon?: ReactNode
}

export default function StatCard({ label, value, sub, valueClassName = 'text-brand-600', icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-slate-400 text-lg">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${valueClassName}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
