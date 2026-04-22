export function dotColor(value: number, isD1: boolean): string {
  const bad = isD1 ? value > 0.7 : value < 0.4
  const good = isD1 ? value < 0.4 : value > 0.7
  if (bad) return 'bg-red-500'
  if (good) return 'bg-green-500'
  return 'bg-yellow-400'
}

export function textColor(value: number, isD1: boolean): string {
  const c = dotColor(value, isD1)
  if (c === 'bg-red-500') return 'text-red-600 font-bold'
  if (c === 'bg-green-500') return 'text-green-600 font-bold'
  return 'text-yellow-600 font-bold'
}

export function calcD1(iva: number, bes: number, vac: number): number {
  return Math.round((iva * 0.5 + bes * 0.3 + vac * 0.2) * 10000) / 10000
}

export function calcD2(ioe: number, ihe: number, iea: number): number {
  return Math.round((ioe * 0.4 + ihe * 0.35 + iea * 0.25) * 10000) / 10000
}
