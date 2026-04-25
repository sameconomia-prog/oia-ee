import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vacantes IA',
  description: 'Empleos en México que demandan habilidades de inteligencia artificial y análisis de datos.',
}

export default function VacantesLayout({ children }: { children: React.ReactNode }) {
  return children
}
