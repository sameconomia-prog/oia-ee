'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { getSkillGraph } from '@/lib/api'
import type { SkillGraphData, SkillNode, IaLabel } from '@/lib/types'
import Badge from '@/components/ui/Badge'

const ResponsiveTreeMap = dynamic(
  () => import('@nivo/treemap').then(m => m.ResponsiveTreeMap),
  { ssr: false }
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

function TrendArrow({ trend }: { trend: number }) {
  if (trend > 0.005) return <span className="text-emerald-600 text-xs">▲ {(trend * 100).toFixed(1)}%</span>
  if (trend < -0.005) return <span className="text-red-500 text-xs">▼ {Math.abs(trend * 100).toFixed(1)}%</span>
  return <span className="text-slate-400 text-xs">→ estable</span>
}

export default function SkillTreemap({ carreraId }: { carreraId: string }) {
  const [data, setData] = useState<SkillGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'treemap' | 'lista'>('treemap')

  useEffect(() => {
    getSkillGraph(carreraId, 25)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [carreraId])

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Cargando mapa de skills...</span>
      </div>
    )
  }

  if (!data || data.skills.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Sin datos de skills para esta carrera.</span>
      </div>
    )
  }

  const pctTransicion = Math.round(data.pct_en_transicion * 100)
  const treeData = buildTree(data.skills)

  return (
    <div>
      {/* Badge hero + toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-slate-900">{pctTransicion}%</span>
          <span className="text-sm text-slate-600">de skills en transición por IA</span>
        </div>
        <button
          onClick={() => setView(v => v === 'treemap' ? 'lista' : 'treemap')}
          className="text-xs text-brand-600 hover:underline"
        >
          {view === 'treemap' ? 'Ver lista' : 'Ver mapa'}
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mb-4">
        {(Object.entries(IA_LABEL_ES) as [IaLabel, string][]).map(([label, nombre]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: IA_COLORS[label] }} />
            <span className="text-xs text-slate-600">{nombre}</span>
          </div>
        ))}
      </div>

      {view === 'treemap' ? (
        <div className="h-72 w-full">
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
            tooltip={({ node }: any) => (
              <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs min-w-[160px]">
                <p className="font-semibold text-slate-800 mb-1 capitalize">{node.id}</p>
                <div className="flex items-center gap-1 mb-1">
                  <Badge variant={IA_BADGE_VARIANT[(node.data as TreeNode).ia_label]}>
                    {IA_LABEL_ES[(node.data as TreeNode).ia_label]}
                  </Badge>
                </div>
                <p className="text-slate-500">Score IA: <span className="font-mono text-slate-700">{(node.data as TreeNode).ia_score.toFixed(2)}</span></p>
                <p className="text-slate-500 flex items-center gap-1">
                  Tendencia: <TrendArrow trend={(node.data as TreeNode).trend_12m} />
                </p>
              </div>
            )}
          />
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {data.skills.map(s => (
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
    </div>
  )
}
