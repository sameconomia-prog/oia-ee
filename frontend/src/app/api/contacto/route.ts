import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.nombre || !body.email || !body.institucion) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  try {
    const res = await fetch(`${API_URL}/publico/contacto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const detail = await res.text()
      return NextResponse.json({ error: detail }, { status: res.status })
    }
    return NextResponse.json({ ok: true, mensaje: 'Solicitud recibida. Te contactaremos en 24 horas.' })
  } catch {
    // backend no disponible — log y responder ok para no bloquear al visitante
    console.error('[contacto] backend unreachable')
    return NextResponse.json({ ok: true, mensaje: 'Solicitud recibida.' })
  }
}
