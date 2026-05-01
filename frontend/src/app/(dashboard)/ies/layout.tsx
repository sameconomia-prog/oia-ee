import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Instituciones',
  description: 'Lista de instituciones de educación superior monitoreadas por el OIA-EE con indicadores KPI de sus programas académicos.',
}

export default function IesLayout({ children }: { children: React.ReactNode }) {
  return children
}
