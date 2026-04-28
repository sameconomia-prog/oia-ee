// frontend/src/components/ui/Badge.tsx
import { type ReactNode } from 'react'

type Variant = 'risk' | 'oportunidad' | 'neutro' | 'default'

const VARIANTS: Record<Variant, string> = {
  risk:        'bg-red-50 text-red-600',
  oportunidad: 'bg-emerald-50 text-emerald-600',
  neutro:      'bg-slate-100 text-slate-500',
  default:     'bg-brand-50 text-brand-600',
}

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  )
}
