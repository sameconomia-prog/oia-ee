import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Instrument_Serif, Syne, Outfit, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { cn } from '@/lib/utils'

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-serif',
})
const syne = Syne({
  weight: ['700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
})
const outfit = Outfit({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})
const jetbrainsMono = JetBrains_Mono({
  weight: ['500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'OIA-EE — Observatorio IA · Empleo · Educación',
    template: '%s | OIA-EE',
  },
  description: 'Monitoreo en tiempo real del impacto de la IA en educación y empleo en México.',
  keywords: ['IA', 'educación', 'empleo', 'México', 'KPIs', 'observatorio'],
  openGraph: {
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: 'Rankings D1–D7 de carreras por riesgo de automatización.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'OIA-EE',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OIA-EE — Observatorio IA · Empleo · Educación',
    description: '312 IES analizadas. 847 carreras monitoreadas.',
    creator: '@oiaee_mx',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={cn(
        GeistSans.variable,
        instrumentSerif.variable,
        syne.variable,
        outfit.variable,
        jetbrainsMono.variable
      )}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
