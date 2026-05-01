'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getStoredRol } from '@/lib/auth'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface IesOption { id: string; nombre: string; nombre_corto: string | null }
interface Usuario {
  id: string; username: string; ies_id: string; activo: boolean; email: string | null; rol: string
}

const ROL_VARIANT: Record<string, 'risk' | 'neutro' | 'oportunidad' | 'default'> = {
  superadmin: 'risk',
  admin_ies: 'oportunidad',
  researcher: 'neutro',
  viewer: 'default',
}

function authH(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [iesOptions, setIesOptions] = useState<IesOption[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ username: '', password: '', ies_id: '', email: '', rol: 'admin_ies' })
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const rol = getStoredRol()
    if (rol !== 'superadmin') { router.replace('/'); return }
    fetchData()
  }, [router])

  async function fetchData() {
    setLoading(true)
    const [usrs, ies] = await Promise.all([
      fetch(`${BASE}/admin/usuarios/list`, { headers: authH() }).then(r => r.ok ? r.json() : []),
      fetch(`${BASE}/admin/ies`, { headers: authH() }).then(r => r.ok ? r.json() : []),
    ])
    setUsuarios(usrs)
    setIesOptions(ies)
    setLoading(false)
  }

  async function toggleActivo(u: Usuario) {
    await fetch(`${BASE}/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: authH(),
      body: JSON.stringify({ activo: !u.activo }),
    })
    fetchData()
  }

  async function cambiarRol(u: Usuario, nuevoRol: string) {
    await fetch(`${BASE}/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: authH(),
      body: JSON.stringify({ rol: nuevoRol }),
    })
    fetchData()
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    setFormOk(false)
    const res = await fetch(`${BASE}/admin/usuarios/crear`, {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setFormOk(true)
      setForm({ username: '', password: '', ies_id: '', email: '', rol: 'admin_ies' })
      fetchData()
    } else {
      const err = await res.json()
      setFormError(err.detail ?? 'Error al crear usuario')
    }
  }

  const iesMap = Object.fromEntries(iesOptions.map(i => [i.id, i.nombre_corto ?? i.nombre]))

  return (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Gestión de Usuarios"
        subtitle="Solo accesible para superadmin — administra cuentas de IES"
      />

      {/* Crear usuario */}
      <Card className="p-5 mb-6">
        <h2 className="font-semibold text-slate-800 text-sm mb-4">Crear nuevo usuario</h2>
        <form onSubmit={crearUsuario} className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Username"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            required type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            placeholder="Email (opcional)"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            required
            value={form.ies_id}
            onChange={e => setForm(f => ({ ...f, ies_id: e.target.value }))}
            className="col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">— Seleccionar IES —</option>
            {iesOptions.map(i => <option key={i.id} value={i.id}>{i.nombre_corto ?? i.nombre}</option>)}
          </select>
          <select
            value={form.rol}
            onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
            className="col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="admin_ies">admin_ies</option>
            <option value="researcher">researcher</option>
            <option value="viewer">viewer</option>
            <option value="superadmin">superadmin</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="col-span-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
        {formError && <p className="text-red-600 text-xs mt-2">{formError}</p>}
        {formOk && <p className="text-emerald-600 text-xs mt-2">Usuario creado exitosamente.</p>}
      </Card>

      {/* Lista usuarios */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 text-sm">Usuarios ({usuarios.length})</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left">Usuario</th>
                  <th className="px-4 py-2.5 text-left">IES</th>
                  <th className="px-4 py-2.5 text-left">Rol</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                  <th className="px-4 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">{u.username}</p>
                      {u.email && <p className="text-xs text-slate-400">{u.email}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 text-xs">{iesMap[u.ies_id] ?? u.ies_id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={u.rol}
                        onChange={e => cambiarRol(u, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {['viewer', 'researcher', 'admin_ies', 'superadmin'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={u.activo ? 'oportunidad' : 'risk'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => toggleActivo(u)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${u.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
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
