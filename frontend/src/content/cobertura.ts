export type CoberturaItem = {
  tipo: 'logo' | 'quote' | 'tweet'
  fuente: string
  texto?: string
  url?: string
  logo_url?: string
}

// Se llena post-launch cuando haya cobertura real.
// Para activar, agregar items y pasar enabled={true} a <CoberturaPrensa />
export const cobertura: CoberturaItem[] = []
