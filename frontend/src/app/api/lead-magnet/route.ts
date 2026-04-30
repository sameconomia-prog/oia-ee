import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const { email, titulo } = await req.json()

  if (!email) return NextResponse.json({ error: 'email requerido' }, { status: 400 })

  try {
    await fetch(`${API_URL}/publico/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: email.split('@')[0],
        ies_nombre: email.split('@')[1] ?? 'desconocida',
        email,
        mensaje: titulo ?? null,
        origen: 'lead_magnet',
      }),
    })
  } catch {
    console.error('[lead-magnet] backend unreachable')
  }

  return NextResponse.json({ ok: true })
}
