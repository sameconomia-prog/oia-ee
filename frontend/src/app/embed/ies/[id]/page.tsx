import type { Metadata } from 'next'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface IesEmbed {
  id: string
  nombre: string
  nombre_corto: string | null
  promedio_d1: number | null
  promedio_d2: number | null
  carreras_riesgo_alto: number
  total_carreras: number
}

async function fetchIes(id: string): Promise<IesEmbed | null> {
  try {
    const r = await fetch(`${BASE}/publico/ies/${id}`, { next: { revalidate: 3600 } })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const ies = await fetchIes(id)
  return {
    title: ies ? `KPIs — ${ies.nombre_corto ?? ies.nombre}` : 'OIA-EE Widget',
  }
}

function ScoreDot({ score, invert = false }: { score: number; invert?: boolean }) {
  const bad = invert ? score >= 0.7 : score < 0.3
  const good = invert ? score < 0.4 : score >= 0.6
  const color = good ? '#10b981' : bad ? '#ef4444' : '#f59e0b'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 4 }} />
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ background: color, height: '100%', width: `${value * 100}%`, borderRadius: 4, transition: 'width 0.6s' }} />
    </div>
  )
}

export default async function EmbedIesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ies = await fetchIes(id)

  if (!ies) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '16px', color: '#64748b', fontSize: 13 }}>
        Institución no encontrada.
      </div>
    )
  }

  const d1 = ies.promedio_d1 ?? 0
  const d2 = ies.promedio_d2 ?? 0
  const riesgoLabel = d1 >= 0.7 ? 'Alto' : d1 >= 0.4 ? 'Medio' : 'Bajo'
  const riesgoColor = d1 >= 0.7 ? '#ef4444' : d1 >= 0.4 ? '#f59e0b' : '#10b981'
  const oportLabel = d2 >= 0.6 ? 'Alta' : d2 >= 0.35 ? 'Media' : 'Baja'
  const oportColor = d2 >= 0.6 ? '#10b981' : d2 >= 0.35 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '16px 18px',
      maxWidth: 360,
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
              {ies.nombre_corto ?? ies.nombre}
            </p>
            {ies.nombre_corto && (
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>{ies.nombre}</p>
            )}
          </div>
          <div style={{
            background: '#eef2ff', color: '#4f46e5',
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
            letterSpacing: '0.05em', whiteSpace: 'nowrap',
          }}>
            OIA-EE
          </div>
        </div>
      </div>

      {/* KPI bars */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center' }}>
              <ScoreDot score={d1} invert />
              D1 Riesgo Obsolescencia IA
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: riesgoColor }}>
              {d1.toFixed(2)} · {riesgoLabel}
            </span>
          </div>
          <Bar value={d1} color={riesgoColor} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center' }}>
              <ScoreDot score={d2} />
              D2 Oportunidad Laboral IA
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: oportColor }}>
              {d2.toFixed(2)} · {oportLabel}
            </span>
          </div>
          <Bar value={d2} color={oportColor} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{ies.total_carreras}</p>
          <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Carreras monitoreadas
          </p>
        </div>
        <div style={{ flex: 1, background: ies.carreras_riesgo_alto > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: ies.carreras_riesgo_alto > 0 ? '#dc2626' : '#16a34a' }}>
            {ies.carreras_riesgo_alto}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Alto riesgo IA
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, color: '#cbd5e1' }}>
          Datos: OIA-EE · Observatorio IA Educación &amp; Empleo
        </span>
        <a
          href={`https://oia-ee.com/ies/${ies.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 9, color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}
        >
          Ver detalle →
        </a>
      </div>
    </div>
  )
}
