'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/noticias', label: 'Noticias', icon: '📰' },
  { href: '/kpis', label: 'KPIs', icon: '📊' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
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
    </aside>
  )
}
