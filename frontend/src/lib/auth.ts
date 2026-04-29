const TOKEN_KEY = 'oiaee_token'
const IES_ID_KEY = 'oiaee_ies_id'
const IES_NOMBRE_KEY = 'oiaee_ies_nombre'
const ROL_KEY = 'oiaee_rol'

export function saveAuth(token: string, iesId: string, iesNombre?: string, rol?: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(IES_ID_KEY, iesId)
  if (iesNombre) localStorage.setItem(IES_NOMBRE_KEY, iesNombre)
  if (rol) localStorage.setItem(ROL_KEY, rol)
  document.cookie = 'oiaee_authed=1; path=/; max-age=86400; SameSite=Strict'
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
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
  localStorage.removeItem(IES_ID_KEY)
  localStorage.removeItem(IES_NOMBRE_KEY)
  localStorage.removeItem(ROL_KEY)
  document.cookie = 'oiaee_authed=; path=/; max-age=0'
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
