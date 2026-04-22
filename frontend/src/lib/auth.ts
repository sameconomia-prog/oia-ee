const TOKEN_KEY = 'oiaee_token'
const IES_ID_KEY = 'oiaee_ies_id'

export function saveAuth(token: string, iesId: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(IES_ID_KEY, iesId)
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

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(IES_ID_KEY)
  document.cookie = 'oiaee_authed=; path=/; max-age=0'
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
