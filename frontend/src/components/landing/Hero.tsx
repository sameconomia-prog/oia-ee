// frontend/src/components/landing/Hero.tsx
'use client'
import { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import HeroGradientFallback from './ui/HeroGradientFallback'
import GridDecorative from './ui/GridDecorative'
import LeadMagnetModal from './LeadMagnetModal'

const ParticleHero = dynamic(
  () => import('./ParticleHero'),
  { ssr: false, loading: () => <HeroGradientFallback /> }
)

interface HeroProps {
  totalIes: number
  totalCarreras: number
}

export default function Hero({ totalIes, totalCarreras }: HeroProps) {
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const subRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsDesktop(window.matchMedia('(min-width: 1024px)').matches)
  }, [])

  useGSAP(() => {
    if (!headingRef.current) return
    const split = new SplitText(headingRef.current, { type: 'chars,words' })
    const tl = gsap.timeline({ delay: 1.2 })
    tl.from(split.chars, {
      opacity: 0,
      y: 30,
      duration: 0.8,
      stagger: 0.02,
      ease: 'cinematicSmooth',
    })
    if (subRef.current) {
      tl.from(subRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'cinematicSmooth',
      }, '-=0.4')
    }
    if (ctaRef.current) {
      tl.from(Array.from(ctaRef.current.children), {
        opacity: 0,
        y: 16,
        duration: 0.5,
        stagger: 0.1,
        ease: 'cinematicSmooth',
      }, '-=0.3')
    }
    return () => split.revert()
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Background: particle canvas on desktop, CSS gradient on mobile */}
      {isDesktop ? <ParticleHero /> : <HeroGradientFallback />}
      <GridDecorative />

      {/* Bottom vignette fading into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--l-bg-0))' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-24">
        <p
          className="text-xs font-semibold uppercase mb-6"
          style={{ color: 'var(--l-accent)', letterSpacing: '0.2em' }}
        >
          Observatorio de Impacto IA · México 2026
        </p>

        <h1
          ref={headingRef}
          className="font-syne font-bold leading-[1.05] mb-6 max-w-4xl"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            letterSpacing: '-0.04em',
            color: 'var(--l-text-primary)',
          }}
        >
          {totalIes} IES analizadas.{' '}
          {totalCarreras.toLocaleString('es-MX')} carreras monitoreadas.{' '}
          <span style={{ color: 'var(--l-accent)' }}>¿Cómo está la tuya?</span>
        </h1>

        <p
          ref={subRef}
          className="text-lg mb-10 leading-relaxed max-w-2xl"
          style={{ color: 'var(--l-text-secondary)' }}
        >
          OIA-EE monitorea instituciones, carreras y vacantes para anticipar
          qué programas necesitan adaptarse ante la IA — y cuáles ya perdieron la carrera.
        </p>

        {/* IES search form */}
        <form action="/ies" method="get" className="mb-8 max-w-md">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              placeholder="Busca tu institución…"
              className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              style={{
                background: 'var(--l-bg-3)',
                border: '1px solid var(--l-border-mid)',
                color: 'var(--l-text-primary)',
              }}
            />
            <button
              type="submit"
              className="px-5 py-3 text-white rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--l-accent)' }}
            >
              Buscar
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--l-text-muted)' }}>
            Busca por nombre de universidad o siglas
          </p>
        </form>

        {/* Primary CTAs */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center px-8 py-3.5 text-white font-semibold rounded-xl transition-opacity hover:opacity-90"
            style={{ background: 'var(--l-accent)' }}
          >
            Descargar Reporte 2026 →
          </button>
          <Link
            href="#contacto"
            className="inline-flex items-center justify-center px-8 py-3.5 font-semibold rounded-xl transition-colors"
            style={{
              border: '1px solid var(--l-border-strong)',
              color: 'var(--l-text-secondary)',
            }}
          >
            Solicitar análisis de mi institución
          </Link>
        </div>

        <Link
          href="/guia"
          className="mt-4 text-xs inline-block transition-colors hover:opacity-80"
          style={{ color: 'var(--l-text-muted)' }}
        >
          ¿Primera vez? Empieza aquí →
        </Link>
      </div>

      <LeadMagnetModal
        isOpen={open}
        onClose={() => setOpen(false)}
        pdfUrl="/pdfs/oia-ee-reporte-2026.pdf"
        titulo="Reporte 2026 — Impacto IA en Educación Superior México"
      />
    </section>
  )
}
