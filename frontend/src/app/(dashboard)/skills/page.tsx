'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { SkillGraphData, SkillNode, IaLabel } from '@/lib/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

const ResponsiveTreeMap = dynamic(
  () => import('@nivo/treemap').then(m => m.ResponsiveTreeMap),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center text-slate-400 text-sm">Cargando mapa...</div> }
)

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const IA_COLORS: Record<IaLabel, string> = {
  automated: '#EF4444',
  augmented: '#F59E0B',
  resilient: '#10B981',
}

const IA_LABEL_ES: Record<IaLabel, string> = {
  automated: 'Automatizable',
  augmented: 'Augmentado',
  resilient: 'Resiliente',
}

const IA_BADGE_VARIANT: Record<IaLabel, 'risk' | 'neutro' | 'oportunidad'> = {
  automated: 'risk',
  augmented: 'neutro',
  resilient: 'oportunidad',
}

const ALL_LABELS: IaLabel[] = ['automated', 'augmented', 'resilient']

interface TreeNode {
  name: string; value: number; ia_label: IaLabel; ia_score: number; trend_12m: number
}

function buildTree(skills: SkillNode[]) {
  return {
    name: 'skills',
    children: skills.map(s => ({
      name: s.name,
      value: Math.max(Math.round(s.weight * 10000), 1),
      ia_label: s.ia_label,
      ia_score: s.ia_score,
      trend_12m: s.trend_12m,
    })),
  }
}

function TrendArrow({ trend }: { trend: number }) {
  if (trend > 0.005) return <span className="text-emerald-600 text-xs font-mono">▲{(trend * 100).toFixed(1)}%</span>
  if (trend < -0.005) return <span className="text-red-500 text-xs font-mono">▼{Math.abs(trend * 100).toFixed(1)}%</span>
  return <span className="text-slate-400 text-xs">→</span>
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </Card>
  )
}

export default function SkillsPage() {
  const [data, setData] = useState<SkillGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<IaLabel | null>(null)

  useEffect(() => {
    fetch(`${BASE}/skills/global?top_n=60`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter ? (data?.skills ?? []).filter(s => s.ia_label === filter) : (data?.skills ?? [])
  const byLabel = ALL_LABELS.reduce((acc, l) => {
    acc[l] = (data?.skills ?? []).filter(s => s.ia_label === l)
    return acc
  }, {} as Record<IaLabel, SkillNode[]>)

  const top5 = (label: IaLabel) => byLabel[label].slice(0, 5)

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader
        title="Mapa Nacional de Skills — Impacto IA"
        subtitle="Habilidades más demandadas en el mercado laboral y su exposición a la automatización"
      />

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Skills analizados" value={data.skill_count} sub="de vacantes OCC" />
          <StatCard label="En transición IA" value={`${Math.round(data.pct_en_transicion * 100)}%`} sub="automatiz. o augmentados" />
          <StatCard label="Automatizables" value={byLabel.automated.length} sub="riesgo alto" />
          <StatCard label="Resilientes" value={byLabel.resilient.length} sub="baja exposición" />
        </div>
      )}

      {/* Treemap principal */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-semibold text-slate-800">Treemap de Skills</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${filter === null ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
            >
              Todos
            </button>
            {ALL_LABELS.map(label => (
              <button
                key={label}
                onClick={() => setFilter(filter === label ? null : label)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                style={filter === label
                  ? { background: IA_COLORS[label], color: '#fff', borderColor: IA_COLORS[label] }
                  : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }
                }
              >
                {IA_LABEL_ES[label]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center text-slate-400 text-sm">Cargando datos...</div>
        ) : filtered.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles.</div>
        ) : (
          <div className="h-96">
            <ResponsiveTreeMap
              data={buildTree(filtered)}
              identity="name"
              value="value"
              valueFormat=".0f"
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              colors={(node: any) => IA_COLORS[(node.data as TreeNode).ia_label] ?? '#94A3B8'}
              borderWidth={2}
              borderColor="#ffffff"
              labelSkipSize={16}
              labelTextColor="#ffffff"
              parentLabelTextColor="#ffffff"
              enableParentLabel={false}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tooltip={({ node }: any) => {
                const d = node.data as TreeNode
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs min-w-[160px]">
                    <p className="font-semibold text-slate-800 mb-1 capitalize">{node.id}</p>
                    <div className="mb-1"><Badge variant={IA_BADGE_VARIANT[d.ia_label]}>{IA_LABEL_ES[d.ia_label]}</Badge></div>
                    <p className="text-slate-500">Score IA: <span className="font-mono text-slate-700">{d.ia_score.toFixed(2)}</span></p>
                    <p className="text-slate-500 flex items-center gap-1">Tendencia 12m: <TrendArrow trend={d.trend_12m} /></p>
                  </div>
                )
              }}
            />
          </div>
        )}

        {/* Leyenda */}
        <div className="flex gap-4 mt-3">
          {ALL_LABELS.map(l => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: IA_COLORS[l] }} />
              <span className="text-xs text-slate-500">{IA_LABEL_ES[l]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Top 5 por categoría */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {ALL_LABELS.map(label => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ background: IA_COLORS[label] }} />
              <h3 className="font-semibold text-sm text-slate-800">{IA_LABEL_ES[label]}</h3>
              <Badge variant={IA_BADGE_VARIANT[label]}>{byLabel[label].length}</Badge>
            </div>
            <div className="space-y-1.5">
              {top5(label).map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 capitalize truncate">{s.name}</span>
                  <TrendArrow trend={s.trend_12m} />
                </div>
              ))}
              {byLabel[label].length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
            </div>
          </Card>
        ))}
      </div>

      {/* Tabla completa */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 text-sm">Todos los skills ({filtered.length})</h2>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filtered.map((s, i) => (
            <div key={s.name} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-300 w-5">{i + 1}</span>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: IA_COLORS[s.ia_label] }} />
                <span className="text-sm text-slate-700 capitalize">{s.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-slate-400">{(s.weight * 100).toFixed(2)}%</span>
                <TrendArrow trend={s.trend_12m} />
                <Badge variant={IA_BADGE_VARIANT[s.ia_label]}>{IA_LABEL_ES[s.ia_label]}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
