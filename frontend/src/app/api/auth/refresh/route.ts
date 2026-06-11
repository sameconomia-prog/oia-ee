import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const IS_PROD = process.env.NODE_ENV === 'production'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { refresh_token?: string } | null
  if (!body?.refresh_token) {
    return NextResponse.json({ error: 'refresh_token requerido' }, { status: 400 })
  }

  const backendRes = await fetch(`${BACKEND}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: body.refresh_token }),
  })

  if (!backendRes.ok) {
    // Limpiar la cookie si el refresh falla
    const errResponse = NextResponse.json({ error: 'Refresh inválido' }, { status: 401 })
    errResponse.cookies.set('oiaee_jwt', '', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/', maxAge: 0 })
    return errResponse
  }

  const data = await backendRes.json() as { access_token: string; token_type: string }

  const response = NextResponse.json(data, { status: 200 })
  // Renovar la HttpOnly cookie con el nuevo access token
  response.cookies.set('oiaee_jwt', data.access_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: 900,
  })
  return response
}
