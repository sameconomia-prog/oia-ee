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
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`sticky top-0 z-50 bg-white transition-shadow ${scrolled ? 'shadow-sm' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-[#1D4ED8] text-lg tracking-tight">
          OIA-EE
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="text-sm text-gray-600 hover:text-[#1D4ED8] transition-colors">
              {l.label}
            </Link>
          ))}
          <Link href="/#contacto"
            className="bg-[#1D4ED8] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Contacto
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-600"
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

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-3">
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block text-sm text-gray-700 hover:text-[#1D4ED8]">
              {l.label}
            </Link>
          ))}
          <Link href="/#contacto" onClick={() => setOpen(false)}
            className="block bg-[#1D4ED8] text-white text-sm font-semibold px-4 py-2 rounded-lg text-center hover:bg-blue-700 transition-colors">
            Contacto
          </Link>
        </div>
      )}
    </nav>
  )
}
