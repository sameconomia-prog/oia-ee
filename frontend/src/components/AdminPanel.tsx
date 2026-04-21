'use client'
import { useState } from 'react'
import { postIngestGdelt } from '@/lib/api'
import type { IngestResult } from '@/lib/types'

const HISTORY_KEY = 'gdelt_history'
const MAX_HISTORY = 10

interface HistoryEntry {
  timestamp: string
  result: IngestResult
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IngestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())

  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''

  async function handleIngest() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await postIngestGdelt(adminKey)
      setResult(r)
      const entry: HistoryEntry = { timestamp: new Date().toISOString(), result: r }
      const updated = [entry, ...loadHistory()].slice(0, MAX_HISTORY)
      saveHistory(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  return (
    <div className="max-w-xl">
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">Actualización GDELT</h2>
        <button
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
          onClick={handleIngest}
          disabled={loading}
        >
          {loading ? (
            <><span className="inline-block animate-spin">↻</span> Cargando...</>
          ) : (
            <>↻ Actualizar GDELT</>
          )}
        </button>

        {result && (
          <div className="mt-3 flex gap-4 bg-green-50 border border-green-200 rounded p-3 text-sm">
            <span><strong>Fetched:</strong> {result.fetched}</span>
            <span><strong>Stored:</strong> {result.stored}</span>
            <span><strong>Classified:</strong> {result.classified}</span>
            <span><strong>Embedded:</strong> {result.embedded}</span>
          </div>
        )}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            Error: {error}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold">Historial de ejecuciones</h2>
          {history.length > 0 && (
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={clearHistory}
            >
              Limpiar historial
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">Sin ejecuciones previas.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h, i) => (
              <li key={i} className="text-xs bg-gray-50 border rounded px-3 py-2">
                <span className="text-gray-500">{formatTs(h.timestamp)}</span>
                {' — '}
                fetched {h.result.fetched} / stored {h.result.stored} / classified{' '}
                {h.result.classified} / embedded {h.result.embedded}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
