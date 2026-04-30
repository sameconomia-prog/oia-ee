// frontend/src/lib/whitelabel.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface WhiteLabelConfig {
  ies_id: string
  nombre_app: string | null
  logo_url: string | null
  color_primario: string | null
  color_acento: string | null
  footer_texto: string | null
  activo: boolean
}

let _cache: WhiteLabelConfig | null | undefined = undefined

export async function fetchWhiteLabel(iesId?: string): Promise<WhiteLabelConfig | null> {
  if (_cache !== undefined) return _cache
  try {
    const qs = iesId ? `?ies_id=${iesId}` : ''
    const res = await fetch(`${BASE}/whitelabel/config${qs}`, { cache: 'no-store' })
    if (!res.ok) { _cache = null; return null }
    _cache = await res.json()
    return _cache ?? null
  } catch {
    _cache = null
    return null
  }
}

export function applyWhiteLabel(cfg: WhiteLabelConfig | null): void {
  if (typeof document === 'undefined' || !cfg) return
  const root = document.documentElement
  if (cfg.color_primario) root.style.setProperty('--color-brand', cfg.color_primario)
  if (cfg.color_acento)   root.style.setProperty('--color-accent', cfg.color_acento)
}
