import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: 'OIA-EE — Observatorio IA · Empleo · Educación',
    template: '%s | OIA-EE',
  },
  description: 'Monitoreo en tiempo real del impacto de la IA en educación y empleo en México. Rankings D1-D7, comparación IES, alertas y tendencias.',
  keywords: ['IA', 'educación', 'empleo', 'México', 'KPIs', 'observatorio', 'automatización'],
  openGraph: {
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: 'Rankings D1–D7 de carreras por riesgo de automatización. Datos abiertos sobre IES en México.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'OIA-EE',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", GeistSans.variable)}>
      <body className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
