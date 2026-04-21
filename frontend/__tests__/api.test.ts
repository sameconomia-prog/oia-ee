import { getNoticias, getKpis, postIngestGdelt } from '@/lib/api'

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
