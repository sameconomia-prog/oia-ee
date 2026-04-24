'use client'
import { useState, useCallback, useEffect } from 'react'
import {
  postIngestGdelt, postIngestNoticias, postSeedDemo, getAdminStatus,
  getAdminIes, postAdminUsuario, postTriggerAlertJob,
} from '@/lib/api'

const HISTORY_KEY = 'admin_history'
const MAX_HISTORY = 10

interface HistoryEntry {
  timestamp: string
  action: string
  detail: string
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded p-3 text-center bg-white">
      <p className="text-2xl font-bold text-blue-700">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function AdminPanel() {
  const [loading, setLoading] = useState<string | null>(null)
  const [status, setStatus] = useState<Record<string, number> | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  const [error, setError] = useState<string | null>(null)

  // Crear usuario
  const [iesOptions, setIesOptions] = useState<{ id: string; nombre: string }[]>([])
  const [newUser, setNewUser] = useState({ username: '', password: '', ies_id: '' })
  const [userMsg, setUserMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''

  const addHistory = useCallback((action: string, detail: string) => {
    const entry: HistoryEntry = { timestamp: new Date().toISOString(), action, detail }
    const updated = [entry, ...loadHistory()].slice(0, MAX_HISTORY)
    saveHistory(updated)
    setHistory(updated)
  }, [])

  async function runAction(key: string, label: string, fn: () => Promise<object>) {
    setLoading(key)
    setError(null)
    try {
      const result = await fn()
      const detail = Object.entries(result).map(([k, v]) => `${k}:${v}`).join(' ')
      addHistory(label, detail)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  async function fetchStatus() {
    setLoading('status')
    setError(null)
    try {
      const s = await getAdminStatus(adminKey)
      setStatus(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  async function fetchIes() {
    try {
      const list = await getAdminIes(adminKey)
      setIesOptions(list)
      if (list.length > 0 && !newUser.ies_id) {
        setNewUser(u => ({ ...u, ies_id: list[0].id }))
      }
    } catch { /* silencioso si no hay key */ }
  }

  useEffect(() => { fetchIes() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCrearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setLoading('crear-usuario')
    setUserMsg(null)
    try {
      const user = await postAdminUsuario(adminKey, newUser)
      setUserMsg({ ok: true, text: `Usuario "${user.username}" creado.` })
      setNewUser(u => ({ ...u, username: '', password: '' }))
      addHistory('Crear Usuario', `${user.username} → ${user.ies_id}`)
    } catch (e) {
      setUserMsg({ ok: false, text: e instanceof Error ? e.message : 'Error' })
    } finally {
      setLoading(null)
    }
  }

  function Btn({ id, label, color = 'blue', onClick }: { id: string; label: string; color?: string; onClick: () => void }) {
    const colors: Record<string, string> = {
      blue: 'bg-blue-600 hover:bg-blue-700',
      green: 'bg-green-600 hover:bg-green-700',
      purple: 'bg-purple-600 hover:bg-purple-700',
      orange: 'bg-orange-500 hover:bg-orange-600',
      gray: 'bg-gray-600 hover:bg-gray-700',
    }
    return (
      <button
        onClick={onClick}
        disabled={loading !== null}
        className={`${colors[color] ?? colors.blue} disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1.5`}
      >
        {loading === id ? <span className="inline-block animate-spin">↻</span> : '▶'}
        {label}
      </button>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Estado BD */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Estado de la BD</h2>
          <Btn id="status" label="Actualizar" color="gray" onClick={fetchStatus} />
        </div>
        {status ? (
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(status).map(([k, v]) => <StatCard key={k} label={k} value={v} />)}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Haz clic en "Actualizar" para ver el estado.</p>
        )}
      </section>

      {/* Acciones de datos */}
      <section>
        <h2 className="text-base font-semibold mb-3">Acciones de datos</h2>
        <div className="flex flex-wrap gap-2">
          <Btn
            id="seed"
            label="Seed Demo"
            color="green"
            onClick={() => runAction('seed', 'Seed Demo', () => postSeedDemo(adminKey))}
          />
          <Btn
            id="noticias"
            label="Ingest Noticias"
            color="blue"
            onClick={() => runAction('noticias', 'Ingest Noticias', () => postIngestNoticias(adminKey))}
          />
          <Btn
            id="gdelt"
            label="Ingest GDELT"
            color="purple"
            onClick={() => runAction('gdelt', 'Ingest GDELT', () => postIngestGdelt(adminKey))}
          />
          <Btn
            id="alertas"
            label="Generar Alertas"
            color="orange"
            onClick={() => runAction('alertas', 'Alert Job', () => postTriggerAlertJob(adminKey))}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Seed Demo → inserta 8 IES + 25 vacantes + 15 noticias de ejemplo.
        </p>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Crear Usuario */}
      <section>
        <h2 className="text-base font-semibold mb-3">Crear Usuario Rector</h2>
        <form onSubmit={handleCrearUsuario} className="space-y-3 bg-white border rounded p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input
                type="text"
                required
                value={newUser.username}
                onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="rector@ies"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={newUser.password}
                onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="min 6 caracteres"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">IES</label>
            {iesOptions.length === 0 ? (
              <p className="text-xs text-gray-400">Carga el estado primero (o ejecuta Seed Demo).</p>
            ) : (
              <select
                value={newUser.ies_id}
                onChange={e => setNewUser(u => ({ ...u, ies_id: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {iesOptions.map(i => (
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading !== null || iesOptions.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm"
            >
              {loading === 'crear-usuario' ? 'Creando...' : 'Crear Usuario'}
            </button>
            {userMsg && (
              <span className={`text-xs ${userMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {userMsg.text}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Historial */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold">Historial</h2>
          {history.length > 0 && (
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]) }}
            >
              Limpiar
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">Sin ejecuciones previas.</p>
        ) : (
          <ul className="space-y-1">
            {history.map((h, i) => (
              <li key={i} className="text-xs bg-gray-50 border rounded px-3 py-1.5 flex gap-3">
                <span className="text-gray-400 shrink-0">{formatTs(h.timestamp)}</span>
                <span className="font-medium text-gray-700">{h.action}</span>
                <span className="text-gray-500">{h.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
