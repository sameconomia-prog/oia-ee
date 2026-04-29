import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import '../globals.css'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: { default: 'OIA-EE — Demo', template: '%s | OIA-EE' },
  description: 'Observatorio de Impacto IA en Educación y Empleo — solicita tu demo.',
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn('font-sans', GeistSans.variable)}>
      <body className="min-h-screen bg-white font-sans">{children}</body>
    </html>
  )
}
