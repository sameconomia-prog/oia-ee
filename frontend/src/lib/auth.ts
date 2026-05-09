const TOKEN_KEY = 'oiaee_token'
const REFRESH_KEY = 'oiaee_refresh_token'
const IES_ID_KEY = 'oiaee_ies_id'
const IES_NOMBRE_KEY = 'oiaee_ies_nombre'
const ROL_KEY = 'oiaee_rol'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface JwtPayload {
  sub: string
  ies_id: string
  rol: string
  exp: number
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    const json = typeof atob !== 'undefined'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function saveAuth(
  token: string,
  iesId: string,
  iesNombre?: string,
  rol?: string,
  refreshToken?: string,
): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(IES_ID_KEY, iesId)
  if (iesNombre) localStorage.setItem(IES_NOMBRE_KEY, iesNombre)
  if (rol) localStorage.setItem(ROL_KEY, rol)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  document.cookie = 'oiaee_authed=1; path=/; max-age=86400; SameSite=Strict'
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredIesId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(IES_ID_KEY)
}

export function getStoredIesNombre(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(IES_NOMBRE_KEY)
}

export function getStoredRol(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ROL_KEY)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(IES_ID_KEY)
  localStorage.removeItem(IES_NOMBRE_KEY)
  localStorage.removeItem(ROL_KEY)
  document.cookie = 'oiaee_authed=; path=/; max-age=0'
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

let _refreshInFlight: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (_refreshInFlight) return _refreshInFlight
  const refresh = getRefreshToken()
  if (!refresh) return null

  _refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (!res.ok) {
        clearAuth()
        return null
      }
      const data = await res.json()
      if (!data.access_token) return null
      localStorage.setItem(TOKEN_KEY, data.access_token)
      return data.access_token as string
    } catch {
      return null
    } finally {
      _refreshInFlight = null
    }
  })()

  return _refreshInFlight
}
