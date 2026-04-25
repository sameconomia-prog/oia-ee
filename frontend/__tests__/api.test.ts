import {
  getNoticias, getKpis, postIngestGdelt, getRectorData, getAlertas, markAlertaRead,
  getVacanteDetalle, getCarreraDetalle, getIesDetalle, getNoticiaDetalle,
  getSectoresVacantes, getSectoresNoticias, getVacantesPublico,
  getKpisHistorico, getCarrerasPublico, getEstadisticasPublicas,
} from '@/lib/api'
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

describe('getVacanteDetalle', () => {
  it('retorna VacantePublico para ID existente', async () => {
    const mock = { id: 'v1', titulo: 'ML Engineer', empresa: 'TechCo', sector: 'tecnologia',
      estado: 'CDMX', skills: ['Python', 'TensorFlow'], salario_min: 30000, salario_max: 50000,
      experiencia_anios: 2, nivel_educativo: 'Licenciatura', fecha_pub: '2026-01-01' }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mock })
    const result = await getVacanteDetalle('v1')
    expect(result.titulo).toBe('ML Engineer')
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/publico/vacantes/v1'))
  })

  it('lanza error en HTTP 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(getVacanteDetalle('inexistente')).rejects.toThrow('HTTP 404')
  })
})

describe('getCarreraDetalle', () => {
  it('retorna CarreraDetalle con KPIs e instituciones', async () => {
    const mock = {
      id: 'c1', nombre: 'Ingeniería en IA',
      kpi: { d1_obsolescencia: { score: 0.3 }, d2_oportunidades: { score: 0.8 },
             d3_mercado: { score: 0.7 }, d6_estudiantil: { score: 0.6 } },
      instituciones: [{ ies_id: 'ies-1', ies_nombre: 'UNAM', matricula: 500, ciclo: '2024-1' }],
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mock })
    const result = await getCarreraDetalle('c1')
    expect(result.nombre).toBe('Ingeniería en IA')
    expect(result.instituciones).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/publico/carreras/c1'))
  })
})

describe('getIesDetalle', () => {
  it('retorna IesDetalle con estadísticas agregadas', async () => {
    const mock = { id: 'ies-1', nombre: 'UNAM', nombre_corto: 'UNAM',
      total_carreras: 12, promedio_d1: 0.45, promedio_d2: 0.62, carreras_riesgo_alto: 3 }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mock })
    const result = await getIesDetalle('ies-1')
    expect(result.nombre).toBe('UNAM')
    expect(result.total_carreras).toBe(12)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/publico/ies/ies-1'))
  })
})

describe('getNoticiaDetalle', () => {
  it('retorna Noticia por ID', async () => {
    const mock = { id: 'n1', titulo: 'IA reemplaza empleos', url: 'http://x.com',
      fuente: 'gdelt', fecha_pub: '2026-01-01', fecha_ingesta: '2026-01-01',
      pais: 'Mexico', sector: 'tecnologia', tipo_impacto: 'riesgo' }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mock })
    const result = await getNoticiaDetalle('n1')
    expect(result.titulo).toBe('IA reemplaza empleos')
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/noticias/n1'))
  })
})

describe('getSectoresVacantes', () => {
  it('retorna lista de sectores únicos', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ['educacion', 'tecnologia'] })
    const result = await getSectoresVacantes()
    expect(result).toEqual(['educacion', 'tecnologia'])
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/publico/sectores'))
  })
})

describe('getSectoresNoticias', () => {
  it('retorna lista de sectores de noticias', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ['finanzas', 'logistica'] })
    const result = await getSectoresNoticias()
    expect(result).toEqual(['finanzas', 'logistica'])
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/noticias/sectores'))
  })
})

describe('getVacantesPublico', () => {
  it('llama con parámetros sector y limit correctos', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    await getVacantesPublico({ sector: 'tecnologia', limit: 10 })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sector=tecnologia')
    )
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=10'))
  })

  it('retorna array vacío cuando no hay vacantes', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    const result = await getVacantesPublico()
    expect(result).toEqual([])
  })
})

describe('getKpisHistorico', () => {
  it('retorna HistoricoSerie para carrera y KPI dados', async () => {
    const mock = {
      carrera_id: 'c1',
      kpi_nombre: 'd1_score',
      serie: [
        { fecha: '2026-01-01', valor: 0.65 },
        { fecha: '2026-02-01', valor: 0.70 },
      ],
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mock })
    const result = await getKpisHistorico('c1', 'd1_score', 10)
    expect(result.carrera_id).toBe('c1')
    expect(result.serie).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/kpis/historico/carrera/c1')
    )
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('kpi=d1_score'))
  })

  it('lanza error en respuesta no-OK', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(getKpisHistorico('c1')).rejects.toThrow('HTTP 500')
  })
})

describe('getCarrerasPublico', () => {
  it('llama con parámetro q correctamente', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    await getCarrerasPublico({ q: 'derecho', limit: 10 })
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('q=derecho'))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=10'))
  })

  it('retorna lista de CarreraKpi en éxito', async () => {
    const mock = [
      { id: 'c1', nombre: 'Derecho', matricula: 300, kpi: null },
    ]
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mock })
    const result = await getCarrerasPublico()
    expect(result).toHaveLength(1)
    expect(result[0].nombre).toBe('Derecho')
  })
})

describe('getEstadisticasPublicas', () => {
  it('retorna estadísticas consolidadas', async () => {
    const mock = {
      total_ies: 10, total_carreras: 50, total_vacantes: 200,
      total_noticias: 500, alertas_activas: 3, top_skills: ['Python', 'SQL'],
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mock })
    const result = await getEstadisticasPublicas()
    expect(result.total_ies).toBe(10)
    expect(result.top_skills).toEqual(['Python', 'SQL'])
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/publico/estadisticas'))
  })

  it('lanza error en respuesta no-OK', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })
    await expect(getEstadisticasPublicas()).rejects.toThrow('HTTP 503')
  })
})
