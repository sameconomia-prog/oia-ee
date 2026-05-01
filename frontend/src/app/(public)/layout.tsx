import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'OIA-EE — Demo', template: '%s | OIA-EE' },
  description: 'Observatorio de Impacto IA en Educación y Empleo — solicita tu demo.',
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans">{children}</div>
  )
}
