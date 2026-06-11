import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const IS_PROD = process.env.NODE_ENV === 'production'

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const backendRes = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: formData.get('username') as string ?? '',
      password: formData.get('password') as string ?? '',
    }).toString(),
  })

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: 'Usuario o contraseña incorrectos' },
      { status: backendRes.status }
    )
  }

  const data = await backendRes.json() as {
    access_token: string
    refresh_token: string
    token_type: string
  }

  // Devolver tokens al cliente para que los guarde en localStorage (para authedFetch)
  // + setear cookie HttpOnly para que el middleware pueda validar criptográficamente
  const response = NextResponse.json(data, { status: 200 })
  response.cookies.set('oiaee_jwt', data.access_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: 900, // 15 min, igual que la expiración del access token
  })
  // Eliminar la cookie no-httpOnly legacy si existía
  response.cookies.delete('oiaee_authed')
  return response
}
