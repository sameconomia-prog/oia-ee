'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCarrerasPublico, getIesPublico, getVacantesPublico, getBenchmarkSkillsIndex, getBenchmarkCareers } from '@/lib/api'
import type { SkillIndexItem, BenchmarkCareerSummary } from '@/lib/types'

type Tipo = 'carrera' | 'ies' | 'vacante' | 'skill' | 'benchmark'

interface Resultado {
  tipo: Tipo
  id: string
  titulo: string
  subtitulo: string | null
  href: string
}

const TIPO_LABEL: Record<Tipo, string> = {
  carrera: 'Carrera',
  ies: 'Institución',
  vacante: 'Vacante',
  skill: 'Habilidad',
  benchmark: 'Benchmark',
}

const TIPO_CLASS: Record<Tipo, string> = {
  carrera: 'bg-indigo-50 text-indigo-700',
  ies: 'bg-emerald-50 text-emerald-700',
  vacante: 'bg-blue-50 text-blue-700',
  skill: 'bg-violet-50 text-violet-700',
  benchmark: 'bg-orange-50 text-orange-700',
}


const ACCESOS_RAPIDOS: { href: string; label: string }[] = [
  { href: '/kpis', label: 'KPIs del Observatorio' },
  { href: '/carreras', label: 'Explorar Carreras' },
  { href: '/ies', label: 'Instituciones' },
  { href: '/benchmarks', label: 'Benchmarks Globales' },
  { href: '/benchmarks/skills', label: 'Índice de Habilidades' },
  { href: '/benchmarks/fuentes', label: 'Fuentes de Benchmarks' },
  { href: '/benchmarks/comparar', label: 'Comparar Carreras' },
  { href: '/estadisticas', label: 'Estadísticas' },
  { href: '/vacantes', label: 'Vacantes IA' },
]

export default function BusquedaGlobal() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const skillsRef = useRef<SkillIndexItem[]>([])
  const careersRef = useRef<BenchmarkCareerSummary[]>([])

  // Cmd+K global + custom event from Sidebar
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    function onOpenSearch() { setOpen(true) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('oia:buscar', onOpenSearch)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('oia:buscar', onOpenSearch)
    }
  }, [])

  // Focus input when modal opens + prefetch skills index
  useEffect(() => {
    if (open) {
      setQ('')
      setResultados([])
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 30)
      if (skillsRef.current.length === 0) {
        getBenchmarkSkillsIndex().then(s => { skillsRef.current = s }).catch(() => {})
      }
      if (careersRef.current.length === 0) {
        getBenchmarkCareers().then(c => { careersRef.current = c }).catch(() => {})
      }
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!q.trim()) { setResultados([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const [carreras, ies, vacantes] = await Promise.allSettled([
          getCarrerasPublico({ q, limit: 5 }),
          getIesPublico({ q }),
          getVacantesPublico({ q, limit: 5 }),
        ])
        const r: Resultado[] = []
        if (carreras.status === 'fulfilled') {
          carreras.value.slice(0, 4).forEach(c => r.push({
            tipo: 'carrera', id: c.id, titulo: c.nombre,
            subtitulo: null, href: `/carreras/${c.id}`,
          }))
        }
        if (ies.status === 'fulfilled') {
          ies.value.slice(0, 3).forEach(i => r.push({
            tipo: 'ies', id: i.id, titulo: i.nombre,
            subtitulo: i.nombre_corto, href: `/ies/${i.id}`,
          }))
        }
        if (vacantes.status === 'fulfilled') {
          vacantes.value.slice(0, 3).forEach(v => r.push({
            tipo: 'vacante', id: v.id, titulo: v.titulo,
            subtitulo: v.empresa, href: `/vacantes/${v.id}`,
          }))
        }
        // Client-side skill search
        const qLow = q.toLowerCase()
        skillsRef.current
          .filter(s => s.skill_nombre.toLowerCase().includes(qLow) || s.skill_id.includes(qLow))
          .slice(0, 3)
          .forEach(s => r.push({
            tipo: 'skill', id: s.skill_id, titulo: s.skill_nombre,
            subtitulo: `${s.direccion_global} · ${s.fuentes_con_datos}/5 fuentes`,
            href: `/benchmarks/skills/${s.skill_id}`,
          }))
        // Client-side benchmark career search
        careersRef.current
          .filter(c => c.nombre.toLowerCase().includes(qLow) || c.slug.includes(qLow))
          .slice(0, 2)
          .forEach(c => r.push({
            tipo: 'benchmark', id: c.slug, titulo: c.nombre,
            subtitulo: `Benchmark · urgencia ${c.urgencia_curricular}/100`,
            href: `/benchmarks/${c.slug}`,
          }))
        setResultados(r)
        setSel(0)
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  function close() { setOpen(false) }

  function navTo(href: string) { router.push(href); close() }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { close(); return }
    const items = q.trim() ? resultados : ACCESOS_RAPIDOS
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setSel(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      if (q.trim() && resultados[sel]) navTo(resultados[sel].href)
      else if (!q.trim() && ACCESOS_RAPIDOS[sel]) navTo(ACCESOS_RAPIDOS[sel].href)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={close}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar carreras, instituciones, habilidades…"
            className="flex-1 py-4 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
          />
          {loading && (
            <span className="text-[11px] text-slate-400 animate-pulse shrink-0">Buscando…</span>
          )}
          <kbd className="shrink-0 hidden sm:inline-flex items-center gap-1 text-[10px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-400 font-mono">
            Esc
          </kbd>
        </div>

        {/* Body */}
        <div className="max-h-[340px] overflow-y-auto">
          {/* No query — quick links */}
          {!q.trim() && (
            <div className="p-2">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Accesos rápidos
              </p>
              {ACCESOS_RAPIDOS.map((l, i) => (
                <button
                  key={l.href}
                  onClick={() => navTo(l.href)}
                  onMouseEnter={() => setSel(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 transition-colors ${
                    sel === i ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {/* Query with results */}
          {q.trim() && !loading && resultados.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-10">
              Sin resultados para &ldquo;{q}&rdquo;
            </p>
          )}

          {q.trim() && resultados.length > 0 && (
            <div className="p-2">
              {resultados.map((r, i) => (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => navTo(r.href)}
                  onMouseEnter={() => setSel(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    sel === i ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TIPO_CLASS[r.tipo]}`}>
                    {TIPO_LABEL[r.tipo]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.titulo}</p>
                    {r.subtitulo && (
                      <p className="text-xs text-slate-400 truncate">{r.subtitulo}</p>
                    )}
                  </div>
                  <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span><kbd className="border border-slate-200 rounded px-1 py-0.5 font-mono">↑↓</kbd> navegar</span>
            <span><kbd className="border border-slate-200 rounded px-1 py-0.5 font-mono">↵</kbd> abrir</span>
            <span><kbd className="border border-slate-200 rounded px-1 py-0.5 font-mono">Esc</kbd> cerrar</span>
          </div>
          <span className="text-[10px] text-slate-300">OIA-EE</span>
        </div>
      </div>
    </div>
  )
}
