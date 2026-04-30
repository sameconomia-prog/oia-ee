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
