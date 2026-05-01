import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carreras',
  description: 'Explora carreras universitarias con sus indicadores de riesgo de automatización D1, oportunidades D2 y mercado laboral D3.',
}

export default function CarrerasLayout({ children }: { children: React.ReactNode }) {
  return children
}
