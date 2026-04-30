'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isAuthenticated, clearAuth, getStoredIesNombre, getStoredRol, getToken } from '@/lib/auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const SECTIONS = [
  {
    label: 'Explorar',
    links: [
      { href: '/', label: 'Inicio' },
      { href: '/noticias', label: 'Noticias' },
      { href: '/vacantes', label: 'Vacantes' },
      { href: '/ies', label: 'Instituciones' },
      { href: '/carreras', label: 'Carreras' },
      { href: '/planes', label: 'Planes y Precios' },
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
      { href: '/simulador', label: 'Simulador' },
      { href: '/admin', label: 'Administración' },
      { href: '/admin/usuarios', label: 'Usuarios' },
      { href: '/admin/pertinencia', label: 'Pertinencia' },
      { href: '/admin/siia', label: 'SIIA Enterprise' },
      { href: '/admin/whitelabel', label: 'White-label' },
      { href: '/admin/api-keys', label: 'API Keys' },
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
  const [iesNombre, setIesNombre] = useState<string | null>(null)
  const [rol, setRol] = useState<string | null>(null)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    const isAuth = isAuthenticated()
    setAuthed(isAuth)
    setIesNombre(getStoredIesNombre())
    setRol(getStoredRol())
    if (isAuth) {
      const token = getToken()
      fetch(`${BASE}/alertas/count`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setAlertCount(d.count))
        .catch(() => {})
    } else {
      setAlertCount(0)
    }
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

      {/* Search trigger */}
      <div className="px-2 py-2 border-b border-slate-700/60">
        <button
          onClick={() => window.dispatchEvent(new Event('oia:buscar'))}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="text-[10px] border border-slate-600 rounded px-1 py-0.5 font-mono text-slate-500">⌘K</kbd>
        </button>
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
                className={`flex items-center justify-between px-3 py-1.5 rounded-md mb-0.5 text-sm transition-colors ${
                  isActive(href, pathname)
                    ? 'bg-slate-800 text-white border-l-2 border-indigo-400 font-medium pl-[10px]'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <span>{label}</span>
                {href === '/rector' && authed && alertCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {authed && (
        <div className="border-t border-slate-700/60">
          {iesNombre && (
            <div className="px-3 py-2.5 bg-slate-800/60">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Institución</p>
              <p className="text-xs font-medium text-slate-200 leading-tight truncate">{iesNombre}</p>
              {rol && (
                <span className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 uppercase tracking-wide">
                  {rol.replace('_', ' ')}
                </span>
              )}
            </div>
          )}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-1.5 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
