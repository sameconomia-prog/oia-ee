import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Propagar pathname a los layouts via header
  const res = NextResponse.next({
    request: { headers: new Headers({ ...Object.fromEntries(request.headers), 'x-pathname': pathname }) },
  })

  // Auth guard para rutas protegidas
  if (pathname.startsWith('/rector') || pathname.startsWith('/admin')) {
    const authed = request.cookies.get('oiaee_authed')
    if (!authed) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
