'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getStoredRol } from '@/lib/auth'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface WLConfig {
  id?: string
  ies_id: string
  dominio: string | null
  nombre_app: string | null
  logo_url: string | null
  color_primario: string | null
  color_acento: string | null
  footer_texto: string | null
  activo: boolean
  creado_at?: string | null
}

interface IesOption { id: string; nombre: string; nombre_corto: string | null }

const EMPTY_FORM = {
  ies_id: '', dominio: '', nombre_app: '', logo_url: '',
  color_primario: '#1D4ED8', color_acento: '#3B82F6', footer_texto: '', activo: true,
}

function authH(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'medium' })
}

export default function AdminWhiteLabelPage() {
  const router = useRouter()
  const [iesOptions, setIesOptions] = useState<IesOption[]>([])
  const [configs, setConfigs] = useState<WLConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingIes, setEditingIes] = useState<string | null>(null)

  useEffect(() => {
    const rol = getStoredRol()
    if (rol !== 'superadmin') { router.replace('/'); return }
    fetchAll()
  }, [router])

  async function fetchAll() {
    setLoading(true)
    const [cfgs, ies] = await Promise.all([
      fetch(`${BASE}/whitelabel/configs`, { headers: authH() }).then(r => r.ok ? r.json() : []),
      fetch(`${BASE}/admin/ies`, { headers: authH() }).then(r => r.ok ? r.json() : []),
    ])
    setConfigs(cfgs)
    setIesOptions(ies)
    setLoading(false)
  }

  function startEdit(cfg: WLConfig) {
    setEditingIes(cfg.ies_id)
    setForm({
      ies_id: cfg.ies_id,
      dominio: cfg.dominio ?? '',
      nombre_app: cfg.nombre_app ?? '',
      logo_url: cfg.logo_url ?? '',
      color_primario: cfg.color_primario ?? '#1D4ED8',
      color_acento: cfg.color_acento ?? '#3B82F6',
      footer_texto: cfg.footer_texto ?? '',
      activo: cfg.activo,
    })
  }

  function cancelEdit() {
    setEditingIes(null)
    setForm(EMPTY_FORM)
    setError(null)
    setOk(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setOk(false)
    const body = {
      ies_id: form.ies_id,
      dominio: form.dominio || null,
      nombre_app: form.nombre_app || null,
      logo_url: form.logo_url || null,
      color_primario: form.color_primario || null,
      color_acento: form.color_acento || null,
      footer_texto: form.footer_texto || null,
      activo: form.activo,
    }
    const resp = await fetch(`${BASE}/whitelabel/config`, {
      method: 'POST', headers: authH(), body: JSON.stringify(body),
    })
    setSaving(false)
    if (resp.ok) {
      setOk(true)
      setEditingIes(null)
      setForm(EMPTY_FORM)
      fetchAll()
    } else {
      const d = await resp.json().catch(() => ({}))
      setError(d.detail ?? 'Error al guardar')
    }
  }

  async function eliminar(iesId: string) {
    if (!confirm('¿Eliminar configuración white-label?')) return
    await fetch(`${BASE}/whitelabel/config/${iesId}`, { method: 'DELETE', headers: authH() })
    fetchAll()
  }

  const iesMap = Object.fromEntries(iesOptions.map(i => [i.id, i.nombre_corto ?? i.nombre]))

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader
        title="White-label Enterprise"
        subtitle="Personalización de branding por institución — Plan Enterprise"
      />

      {/* Formulario */}
      <Card className="p-5 mb-6">
        <h2 className="font-semibold text-slate-800 text-sm mb-4">
          {editingIes ? `Editando: ${iesMap[editingIes] ?? editingIes}` : 'Nueva configuración white-label'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">IES *</label>
            <select
              required
              value={form.ies_id}
              onChange={e => setForm(f => ({ ...f, ies_id: e.target.value }))}
              disabled={!!editingIes}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50"
            >
              <option value="">— Seleccionar IES —</option>
              {iesOptions.map(i => <option key={i.id} value={i.id}>{i.nombre_corto ?? i.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dominio personalizado</label>
            <input
              type="text"
              placeholder="oia.universidad.edu.mx"
              value={form.dominio}
              onChange={e => setForm(f => ({ ...f, dominio: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la app</label>
            <input
              type="text"
              placeholder="UPAEP Analytics"
              value={form.nombre_app}
              onChange={e => setForm(f => ({ ...f, nombre_app: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">URL del logo</label>
            <input
              type="url"
              placeholder="https://universidad.edu.mx/logo.png"
              value={form.logo_url}
              onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Color primario (#RRGGBB)</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.color_primario}
                onChange={e => setForm(f => ({ ...f, color_primario: e.target.value }))}
                className="w-10 h-9 border border-slate-200 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form.color_primario}
                onChange={e => setForm(f => ({ ...f, color_primario: e.target.value }))}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Color acento (#RRGGBB)</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.color_acento}
                onChange={e => setForm(f => ({ ...f, color_acento: e.target.value }))}
                className="w-10 h-9 border border-slate-200 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form.color_acento}
                onChange={e => setForm(f => ({ ...f, color_acento: e.target.value }))}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Texto de pie de página</label>
            <input
              type="text"
              placeholder="© 2026 Universidad Ejemplo — Plataforma de Inteligencia Institucional"
              value={form.footer_texto}
              onChange={e => setForm(f => ({ ...f, footer_texto: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="col-span-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                className="rounded"
              />
              Activo
            </label>
            <div className="flex gap-2">
              {editingIes && (
                <button type="button" onClick={cancelEdit} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !form.ies_id}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : editingIes ? 'Actualizar' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        </form>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        {ok && <p className="text-emerald-600 text-xs mt-2">Configuración guardada.</p>}
      </Card>

      {/* Lista */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 text-sm">Configuraciones ({configs.length})</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : configs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">Sin configuraciones white-label.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left">IES</th>
                  <th className="px-4 py-2.5 text-left">App</th>
                  <th className="px-4 py-2.5 text-left">Dominio</th>
                  <th className="px-4 py-2.5 text-center">Colores</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                  <th className="px-4 py-2.5 text-left">Creado</th>
                  <th className="px-4 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.ies_id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{iesMap[c.ies_id] ?? c.ies_id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.nombre_app ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{c.dominio ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {c.color_primario && (
                          <span title={c.color_primario} className="w-4 h-4 rounded border border-slate-200 inline-block" style={{ background: c.color_primario }} />
                        )}
                        {c.color_acento && (
                          <span title={c.color_acento} className="w-4 h-4 rounded border border-slate-200 inline-block" style={{ background: c.color_acento }} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={c.activo ? 'oportunidad' : 'risk'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{fmt(c.creado_at)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(c.ies_id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
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
