// frontend/src/components/ui/Card.tsx
import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-card border border-slate-200 p-6 ${className}`}>
      {children}
    </div>
  )
}
