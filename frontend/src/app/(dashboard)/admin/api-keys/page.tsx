'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getStoredRol } from '@/lib/auth'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface ApiKeyItem {
  id: string
  key_prefix: string
  name: string
  email: string
  tier: string
  expires_at: string | null
  revoked: boolean
  created_at: string | null
}

interface ApiKeyCreated {
  id: string
  raw_key: string
  key_prefix: string
  name: string
  email: string
  tier: string
  expires_at: string | null
}

const EMPTY_FORM = { name: '', email: '', tier: 'researcher' as 'researcher' | 'premium', expires_at: '' }

function authH(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'medium' })
}

export default function AdminApiKeysPage() {
  const router = useRouter()
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const rol = getStoredRol()
    if (rol !== 'superadmin') { router.replace('/'); return }
    fetchKeys()
  }, [router])

  async function fetchKeys() {
    setLoading(true)
    const data = await fetch(`${BASE}/admin/api-keys`, { headers: authH() })
      .then(r => r.ok ? r.json() : [])
    setKeys(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setCreated(null)
    const body = {
      name: form.name,
      email: form.email,
      tier: form.tier,
      expires_at: form.expires_at || null,
    }
    const resp = await fetch(`${BASE}/admin/api-keys`, {
      method: 'POST', headers: authH(), body: JSON.stringify(body),
    })
    setSaving(false)
    if (resp.ok) {
      const data = await resp.json()
      setCreated(data)
      setForm(EMPTY_FORM)
      fetchKeys()
    } else {
      const d = await resp.json().catch(() => ({}))
      setError(d.detail ?? 'Error al crear API key')
    }
  }

  async function revocar(keyId: string) {
    if (!confirm('¿Revocar esta API key? La acción es irreversible.')) return
    await fetch(`${BASE}/admin/api-keys/${keyId}`, { method: 'DELETE', headers: authH() })
    fetchKeys()
  }

  const activas = keys.filter(k => !k.revoked).length
  const revocadas = keys.filter(k => k.revoked).length

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader
        title="API Keys"
        subtitle="Acceso programático a datos OIA-EE — tiers researcher y premium"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{keys.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total keys</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{activas}</p>
          <p className="text-xs text-slate-500 mt-0.5">Activas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{revocadas}</p>
          <p className="text-xs text-slate-500 mt-0.5">Revocadas</p>
        </Card>
      </div>

      {/* Formulario nueva key */}
      <Card className="p-5 mb-6">
        <h2 className="font-semibold text-slate-800 text-sm mb-4">Nueva API Key</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre / Organización *</label>
            <input
              required
              type="text"
              placeholder="CETYS Universidad"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email de contacto *</label>
            <input
              required
              type="email"
              placeholder="ti@universidad.edu.mx"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tier</label>
            <select
              value={form.tier}
              onChange={e => setForm(f => ({ ...f, tier: e.target.value as 'researcher' | 'premium' }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="researcher">Researcher — datos públicos</option>
              <option value="premium">Premium — datos completos + exportación</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Expiración (opcional)</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Generando...' : 'Generar API Key'}
            </button>
          </div>
        </form>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

        {created && (
          <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-teal-800 mb-1">
              API Key generada para <span className="font-bold">{created.name}</span> — guárdala ahora, no se mostrará de nuevo:
            </p>
            <code className="block text-xs font-mono text-teal-900 bg-teal-100 px-3 py-2 rounded break-all select-all my-2">
              {created.raw_key}
            </code>
            <div className="flex gap-4 text-xs text-teal-700">
              <span>Tier: <strong>{created.tier}</strong></span>
              <span>Prefijo: <strong>{created.key_prefix}</strong></span>
              {created.expires_at && <span>Expira: <strong>{created.expires_at}</strong></span>}
            </div>
            <p className="text-xs text-teal-600 mt-2">
              Usar en el header: <code className="bg-teal-100 px-1 rounded">Authorization: Bearer {created.raw_key.slice(0, 8)}...</code>
            </p>
          </div>
        )}
      </Card>

      {/* Lista de keys */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 text-sm">API Keys ({keys.length})</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : keys.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">Sin API keys generadas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left">Prefijo</th>
                  <th className="px-4 py-2.5 text-left">Nombre</th>
                  <th className="px-4 py-2.5 text-left">Email</th>
                  <th className="px-4 py-2.5 text-center">Tier</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                  <th className="px-4 py-2.5 text-left">Creada</th>
                  <th className="px-4 py-2.5 text-left">Expira</th>
                  <th className="px-4 py-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{k.key_prefix}...</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{k.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{k.email}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={k.tier === 'premium' ? 'oportunidad' : 'neutro'}>
                        {k.tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={k.revoked ? 'risk' : 'oportunidad'}>
                        {k.revoked ? 'Revocada' : 'Activa'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{fmt(k.created_at)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{fmt(k.expires_at)}</td>
                    <td className="px-4 py-2.5 text-center">
                      {!k.revoked ? (
                        <button
                          onClick={() => revocar(k.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Revocar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
