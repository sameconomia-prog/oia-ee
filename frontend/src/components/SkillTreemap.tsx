'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { getSkillGraph } from '@/lib/api'
import type { SkillGraphData, SkillNode, IaLabel } from '@/lib/types'
import Badge from '@/components/ui/Badge'

const ResponsiveTreeMap = dynamic(
  () => import('@nivo/treemap').then(m => m.ResponsiveTreeMap),
  { ssr: false, loading: () => <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Cargando mapa...</div> }
)

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false, loading: () => <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Cargando grafo...</div> }
)

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

type ViewMode = 'treemap' | 'lista' | 'grafo'

interface TreeNode {
  name: string
  value: number
  ia_label: IaLabel
  ia_score: number
  trend_12m: number
}

interface TreeRoot {
  name: string
  children: TreeNode[]
}

function buildTree(skills: SkillNode[]): TreeRoot {
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

function buildForceGraph(skills: SkillNode[]) {
  const HUB_IDS = { automated: '__hub_auto', augmented: '__hub_aug', resilient: '__hub_res' }
  const hubs = ALL_LABELS.map(label => ({
    id: HUB_IDS[label],
    name: IA_LABEL_ES[label],
    color: IA_COLORS[label],
    val: 12,
    isHub: true,
  }))
  const nodes = skills.map(s => ({
    id: s.name,
    name: s.name,
    color: IA_COLORS[s.ia_label] + 'cc',
    val: Math.max(2, Math.round(s.weight * 500)),
    isHub: false,
    ia_label: s.ia_label,
    ia_score: s.ia_score,
    trend_12m: s.trend_12m,
  }))
  const links = skills.map(s => ({
    source: s.name,
    target: HUB_IDS[s.ia_label],
    color: IA_COLORS[s.ia_label] + '44',
  }))
  return { nodes: [...hubs, ...nodes], links }
}

function TrendArrow({ trend }: { trend: number }) {
  if (trend > 0.005) return <span className="text-emerald-600 text-xs font-mono">▲{(trend * 100).toFixed(1)}%</span>
  if (trend < -0.005) return <span className="text-red-500 text-xs font-mono">▼{Math.abs(trend * 100).toFixed(1)}%</span>
  return <span className="text-slate-400 text-xs">→</span>
}

function FilterChips({ active, onChange }: { active: IaLabel | null; onChange: (l: IaLabel | null) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active === null ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
      >
        Todos
      </button>
      {ALL_LABELS.map(label => (
        <button
          key={label}
          onClick={() => onChange(active === label ? null : label)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors`}
          style={active === label
            ? { background: IA_COLORS[label], color: '#fff', borderColor: IA_COLORS[label] }
            : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }
          }
        >
          {IA_LABEL_ES[label]}
        </button>
      ))}
    </div>
  )
}

export default function SkillTreemap({ carreraId }: { carreraId: string }) {
  const [data, setData] = useState<SkillGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('treemap')
  const [filter, setFilter] = useState<IaLabel | null>(null)
  const graphRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSkillGraph(carreraId, 25)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [carreraId])

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><span className="text-slate-400 text-sm">Cargando mapa de skills...</span></div>
  }

  if (!data || data.skills.length === 0) {
    return <div className="h-32 flex items-center justify-center"><span className="text-slate-400 text-sm">Sin datos de skills para esta carrera.</span></div>
  }

  const pctTransicion = Math.round(data.pct_en_transicion * 100)
  const filtered = filter ? data.skills.filter(s => s.ia_label === filter) : data.skills
  const treeData = buildTree(filtered)
  const forceData = buildForceGraph(filtered)

  const views: { id: ViewMode; label: string }[] = [
    { id: 'treemap', label: 'Mapa' },
    { id: 'lista', label: 'Lista' },
    { id: 'grafo', label: 'Grafo' },
  ]

  return (
    <div>
      {/* Hero + controles */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-slate-900">{pctTransicion}%</span>
          <div>
            <p className="text-sm font-medium text-slate-700">de skills en transición por IA</p>
            <p className="text-xs text-slate-400">{data.skill_count} habilidades analizadas</p>
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 font-medium transition-colors ${view === v.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leyenda + filtros */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <FilterChips active={filter} onChange={setFilter} />
      </div>

      {/* Vistas */}
      {view === 'treemap' && (
        <div className="h-72 w-full">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin skills con este filtro.</div>
          ) : (
            <ResponsiveTreeMap
              data={treeData}
              identity="name"
              value="value"
              valueFormat=".0f"
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              colors={(node: any) => IA_COLORS[(node.data as TreeNode).ia_label] ?? '#94A3B8'}
              borderWidth={2}
              borderColor="#ffffff"
              labelSkipSize={18}
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
                    <p className="text-slate-500 flex items-center gap-1">Tendencia: <TrendArrow trend={d.trend_12m} /></p>
                  </div>
                )
              }}
            />
          )}
        </div>
      )}

      {view === 'lista' && (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Sin skills con este filtro.</p>
          ) : filtered.map(s => (
            <div key={s.name} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: IA_COLORS[s.ia_label] }} />
                <span className="text-sm text-slate-700 capitalize truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <TrendArrow trend={s.trend_12m} />
                <Badge variant={IA_BADGE_VARIANT[s.ia_label]}>{IA_LABEL_ES[s.ia_label]}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'grafo' && (
        <div ref={graphRef} className="h-72 w-full rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ForceGraph2D
            graphData={forceData as any}
            width={graphRef.current?.clientWidth ?? 600}
            height={288}
            backgroundColor="#f8fafc"
            nodeLabel={(node: any) => node.name ?? ''}
            nodeColor={(node: any) => node.color ?? '#94A3B8'}
            nodeVal={(node: any) => node.val ?? 3}
            linkColor={(link: any) => link.color ?? '#cbd5e1'}
            linkWidth={1}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
              const x = node.x ?? 0
              const y = node.y ?? 0
              const r = node.isHub ? 10 : Math.max(3, Math.sqrt((node.val ?? 3) * 4))
              ctx.beginPath()
              ctx.arc(x, y, r, 0, 2 * Math.PI)
              ctx.fillStyle = node.color ?? '#94A3B8'
              ctx.fill()
              if (node.isHub || r > 6) {
                ctx.font = node.isHub ? 'bold 9px sans-serif' : '7px sans-serif'
                ctx.fillStyle = '#1e293b'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText((node.name ?? '').substring(0, 12), x, y + r + 8)
              }
            }}
            cooldownTicks={80}
            d3AlphaDecay={0.03}
          />
        </div>
      )}
    </div>
  )
}
