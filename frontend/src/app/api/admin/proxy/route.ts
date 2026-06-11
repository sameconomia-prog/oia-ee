import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? ''
const JWT_SECRET = process.env.JWT_SECRET_KEY ?? ''

// Mapa de acciones a endpoints del backend
const ACTION_MAP: Record<string, { method: string; path: string }> = {
  status:       { method: 'GET',  path: '/admin/status' },
  gdelt:        { method: 'POST', path: '/admin/ingest/gdelt' },
  noticias:     { method: 'POST', path: '/admin/ingest/noticias' },
  seed:         { method: 'POST', path: '/admin/seed-demo' },
  'alert-job':  { method: 'POST', path: '/admin/jobs/alert-job' },
  snapshot:     { method: 'POST', path: '/admin/jobs/kpi-snapshot' },
  'clear-cache':{ method: 'POST', path: '/admin/cache/clear' },
  'list-ies':   { method: 'GET',  path: '/admin/ies' },
}

async function verifyAdminJwt(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token || !JWT_SECRET) return false
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    const rol = (payload as Record<string, unknown>).rol as string | undefined
    return rol === 'superadmin' || rol === 'admin_ies'
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: 'ADMIN_API_KEY no configurada' }, { status: 503 })
  }

  const isAdmin = await verifyAdminJwt(request)
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const action = body.action as string | undefined

  if (!action || !ACTION_MAP[action]) {
    return NextResponse.json({ error: `Acción inválida: ${action}` }, { status: 400 })
  }

  const { method, path } = ACTION_MAP[action]
  const url = `${BACKEND}${path}`

  const fetchOpts: RequestInit = {
    method,
    headers: { 'X-Admin-Key': ADMIN_KEY },
  }
  if (action === 'create-user' && body.payload) {
    fetchOpts.headers = { ...fetchOpts.headers as Record<string, string>, 'Content-Type': 'application/json' }
    fetchOpts.body = JSON.stringify(body.payload)
  }

  const res = await fetch(url, fetchOpts)
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

// Crear usuario (necesita payload específico)
export async function PUT(request: NextRequest) {
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: 'ADMIN_API_KEY no configurada' }, { status: 503 })
  }

  const isAdmin = await verifyAdminJwt(request)
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const res = await fetch(`${BACKEND}/admin/usuarios`, {
    method: 'POST',
    headers: { 'X-Admin-Key': ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function GET(request: NextRequest) {
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: 'ADMIN_API_KEY no configurada' }, { status: 503 })
  }

  const isAdmin = await verifyAdminJwt(request)
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource')

  if (resource === 'status') {
    const res = await fetch(`${BACKEND}/admin/status`, { headers: { 'X-Admin-Key': ADMIN_KEY } })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  }
  if (resource === 'ies') {
    const res = await fetch(`${BACKEND}/admin/ies`, { headers: { 'X-Admin-Key': ADMIN_KEY } })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  }

  return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
}
