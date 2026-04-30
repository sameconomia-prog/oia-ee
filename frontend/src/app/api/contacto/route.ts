import { NextRequest, NextResponse } from 'next/server'

interface ContactoPayload {
  nombre: string
  cargo?: string
  institucion: string
  email: string
  mensaje?: string
  tipo: 'ies' | 'gobierno'
  area_interes?: string
}

export async function POST(req: NextRequest) {
  const body: ContactoPayload = await req.json()

  if (!body.nombre || !body.email || !body.institucion) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // MVP: log + respuesta 200
  console.log('[contacto]', JSON.stringify(body))

  return NextResponse.json({ ok: true, mensaje: 'Solicitud recibida. Te contactaremos en 24 horas.' })
}
