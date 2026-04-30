import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { headers } from 'next/headers'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import WhiteLabelApplier from '@/components/WhiteLabelApplier'
import BusquedaGlobal from '@/components/BusquedaGlobal'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
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
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: '312 IES analizadas. 847 carreras monitoreadas. El impacto de la IA en la educación superior de México.',
    creator: '@oiaee_mx',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const pathname = hdrs.get('x-pathname') ?? hdrs.get('next-url') ?? ''
  const isEmbed = pathname.startsWith('/embed')

  const isLanding = pathname === '/' || pathname.startsWith('/investigaciones')

  if (isEmbed) {
    return (
      <html lang="es" className={cn("font-sans", GeistSans.variable)}>
        <body className="bg-white">{children}</body>
      </html>
    )
  }

  if (isLanding) {
    return (
      <html lang="es" className={cn("font-sans", GeistSans.variable)}>
        <body className="bg-[#F8FAFC] font-sans">
          <Navbar />
          {children}
          <Footer />
        </body>
      </html>
    )
  }

  return (
    <html lang="es" className={cn("font-sans", GeistSans.variable)}>
      <body className="flex min-h-screen bg-slate-50 font-sans">
        <WhiteLabelApplier />
        <BusquedaGlobal />
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
