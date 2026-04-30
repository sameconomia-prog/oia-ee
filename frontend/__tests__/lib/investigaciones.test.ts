import { parseInvestigacionSlug, getTipoLabel, getAccesoLabel } from '@/lib/investigaciones'

describe('parseInvestigacionSlug', () => {
  it('extrae fecha y titulo del nombre de archivo', () => {
    const result = parseInvestigacionSlug('2026-04-reporte-inaugural')
    expect(result.fecha).toBe('2026-04')
    expect(result.titulo_slug).toBe('reporte-inaugural')
  })
})

describe('getTipoLabel', () => {
  it('devuelve etiqueta legible por tipo', () => {
    expect(getTipoLabel('reporte')).toBe('Reporte')
    expect(getTipoLabel('analisis')).toBe('Análisis')
    expect(getTipoLabel('carta')).toBe('Carta / Op-Ed')
    expect(getTipoLabel('nota')).toBe('Nota de datos')
    expect(getTipoLabel('metodologia')).toBe('Metodología')
  })
})

describe('getAccesoLabel', () => {
  it('devuelve si el contenido es abierto o requiere email', () => {
    expect(getAccesoLabel('abierto')).toBe('Lectura libre')
    expect(getAccesoLabel('lead_magnet')).toBe('PDF descargable')
  })
})
