import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET_KEY ?? ''

async function isValidJwt(token: string): Promise<boolean> {
  if (!token || !JWT_SECRET) return false
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Propagar pathname a los layouts via header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Auth guard para rutas protegidas — validación JWT criptográfica
  if (pathname.startsWith('/rector') || pathname.startsWith('/admin')) {
    const jwtCookie = request.cookies.get('oiaee_jwt')?.value ?? ''
    const valid = await isValidJwt(jwtCookie)
    if (!valid) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
