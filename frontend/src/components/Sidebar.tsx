'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isAuthenticated, clearAuth } from '@/lib/auth'

const links = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/noticias', label: 'Noticias', icon: '📰' },
  { href: '/kpis', label: 'KPIs', icon: '📊' },
  { href: '/comparar', label: 'Comparar', icon: '⚖️' },
  { href: '/metodologia', label: 'Metodología', icon: '📐' },
  { href: '/rector', label: 'Rector', icon: '🏛' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
]

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
    <aside className="w-56 bg-gray-900 text-gray-100 min-h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h1 className="font-bold text-lg">OIA-EE</h1>
        <p className="text-xs text-gray-400">Observatorio IA · Empleo · Educación</p>
      </div>
      <nav className="flex-1 p-2">
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md mb-1 text-sm transition-colors ${
              pathname === href
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      {authed && (
        <div className="p-2 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </aside>
  )
}
