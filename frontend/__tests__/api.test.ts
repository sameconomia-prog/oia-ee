import { getNoticias, getKpis, postIngestGdelt, getRectorData, getAlertas, markAlertaRead } from '@/lib/api'
import type { AlertasHistorial } from '@/lib/types'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => mockFetch.mockReset())

describe('getNoticias', () => {
  it('returns array of noticias on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, titulo: 'Test', url: 'http://x.com', fuente: 'gdelt',
          contenido: '', fecha_pub: '2024-01-01T00:00:00',
          pais: 'Mexico', sector: 'tech', tipo_impacto: 'riesgo' },
      ],
    })
    const result = await getNoticias({ limit: 1 })
    expect(result).toHaveLength(1)
    expect(result[0].titulo).toBe('Test')
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/noticias/'))
  })
})

describe('getKpis', () => {
  it('returns KpiResult for existing carrera', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        d1_obsolescencia: { score: 0.72, iva: 0.8, bes: 0.65, vac: 0.6 },
        d2_oportunidades: { score: 0.58, ioe: 0.7, ihe: 0.45, iea: 0.55 },
      }),
    })
    const result = await getKpis(1)
    expect(result).not.toBeNull()
    expect(result!.d1_obsolescencia.score).toBe(0.72)
  })

  it('returns null for 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    const result = await getKpis(999)
    expect(result).toBeNull()
  })

  it('throws on non-404 server error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(getKpis(1)).rejects.toThrow('HTTP 500')
  })
})

describe('postIngestGdelt', () => {
  it('posts with X-Admin-Key header and returns IngestResult', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fetched: 45, stored: 38, classified: 35, embedded: 33 }),
    })
    const result = await postIngestGdelt('test-key')
    expect(result.fetched).toBe(45)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/ingest/gdelt'),
      expect.objectContaining({ headers: { 'X-Admin-Key': 'test-key' } })
    )
  })
})

describe('network errors', () => {
  it('propagates network failure from getNoticias', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    await expect(getNoticias()).rejects.toThrow('Network error')
  })
})

describe('getRectorData', () => {
  it('returns RectorData on success', async () => {
    const mockData = {
      ies: { id: '1', nombre: 'Humanitas', nombre_corto: 'UH' },
      carreras: [],
      alertas: [],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response)
    const result = await getRectorData('1')
    expect(result.ies.nombre).toBe('Humanitas')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rector?ies_id=1'),
      expect.objectContaining({ headers: expect.any(Object) })
    )
  })

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    await expect(getRectorData('99')).rejects.toThrow('HTTP 404')
  })
})

describe('getAlertas', () => {
  it('retorna AlertasHistorial en éxito', async () => {
    const mockData: AlertasHistorial = { alertas: [], total: 0 }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockData } as Response)
    const result = await getAlertas('ies-abc')
    expect(result.total).toBe(0)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ies_id=ies-abc'),
      expect.objectContaining({ headers: expect.any(Object) })
    )
  })

  it('lanza error en respuesta no-OK', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as Response)
    await expect(getAlertas('ies-abc')).rejects.toThrow('HTTP 500')
  })
})

describe('markAlertaRead', () => {
  it('envía PUT y resuelve sin error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
    await expect(markAlertaRead('alerta-1')).resolves.toBeUndefined()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/alertas/alerta-1/leer'),
      expect.objectContaining({ method: 'PUT' })
    )
  })
})
