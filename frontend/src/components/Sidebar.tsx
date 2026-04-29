'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isAuthenticated, clearAuth } from '@/lib/auth'

const SECTIONS = [
  {
    label: 'Explorar',
    links: [
      { href: '/', label: 'Inicio' },
      { href: '/noticias', label: 'Noticias' },
      { href: '/vacantes', label: 'Vacantes' },
      { href: '/ies', label: 'Instituciones' },
      { href: '/carreras', label: 'Carreras' },
    ],
  },
  {
    label: 'Análisis',
    links: [
      { href: '/kpis', label: 'KPIs' },
      { href: '/estadisticas', label: 'Estadísticas' },
      { href: '/impacto', label: 'Impacto IA' },
      { href: '/skills', label: 'Skills IA' },
      { href: '/comparar', label: 'Comparar IES' },
      { href: '/metodologia', label: 'Metodología' },
    ],
  },
  {
    label: 'Acceso',
    links: [
      { href: '/rector', label: 'Rector' },
      { href: '/admin', label: 'Administración' },
    ],
  },
]

function isActive(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [pathname])

  function handleLogout() {
    clearAuth()
    setAuthed(false)
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-slate-900 text-slate-100 min-h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-700/60">
        <h1 className="font-bold text-base tracking-tight">OIA-EE</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Observatorio IA · Empleo · Educación</p>
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {section.label}
            </p>
            {section.links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-3 py-1.5 rounded-md mb-0.5 text-sm transition-colors ${
                  isActive(href, pathname)
                    ? 'bg-slate-800 text-white border-l-2 border-indigo-400 font-medium pl-[10px]'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {authed && (
        <div className="p-2 border-t border-slate-700/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-1.5 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  )
}
