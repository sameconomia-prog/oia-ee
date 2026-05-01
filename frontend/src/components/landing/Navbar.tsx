// frontend/src/components/landing/Navbar.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const links = [
  { href: '/#como-funciona', label: 'Observatorio' },
  { href: '/plataforma', label: 'Para Instituciones' },
  { href: '/investigaciones', label: 'Investigaciones' },
  { href: '/guia', label: 'Guía' },
  { href: '/#sobre', label: 'Sobre' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-md border-b'
          : 'border-b border-transparent'
      }`}
      style={scrolled ? {
        background: 'var(--l-nav-bg-scrolled)',
        borderColor: 'var(--l-border-subtle)',
      } : undefined}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-syne font-bold text-lg tracking-tight transition-colors"
          style={{ color: 'var(--l-text-primary)' }}
        >
          OIA-EE
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm transition-colors hover:opacity-100"
              style={{ color: 'var(--l-text-secondary)' }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#contacto"
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--l-accent)',
              color: 'var(--l-accent)',
            }}
          >
            Contacto
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 transition-colors"
          style={{ color: 'var(--l-text-secondary)' }}
          onClick={() => setOpen(o => !o)}
          aria-label="Menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden border-t px-6 py-4 space-y-4 backdrop-blur-md"
          style={{
            borderColor: 'var(--l-border-subtle)',
            background: 'var(--l-nav-bg-drawer)',
          }}
        >
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm transition-colors"
              style={{ color: 'var(--l-text-secondary)' }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#contacto"
            onClick={() => setOpen(false)}
            className="block text-sm font-semibold px-4 py-2 rounded-lg text-center transition-colors"
            style={{
              border: '1px solid var(--l-accent)',
              color: 'var(--l-accent)',
            }}
          >
            Contacto
          </Link>
        </div>
      )}
    </nav>
  )
}
