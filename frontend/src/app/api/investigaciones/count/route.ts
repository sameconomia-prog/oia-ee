import { NextResponse } from 'next/server'
import { getAllInvestigaciones } from '@/lib/investigaciones'

export function GET() {
  const todas = getAllInvestigaciones()
  const porTipo = todas.reduce<Record<string, number>>((acc, i) => {
    acc[i.tipo] = (acc[i.tipo] ?? 0) + 1
    return acc
  }, {})
  return NextResponse.json({ total: todas.length, por_tipo: porTipo })
}
