export type MetricValue = number | string | null | undefined

export function isMaskedValue(val: MetricValue): boolean {
  return val === '**'
}

export function toMetricNumber(val: MetricValue, fallback = 0): number {
  if (isMaskedValue(val)) return fallback
  const n = Number(val ?? fallback)
  return Number.isFinite(n) ? n : fallback
}

export function formatNumber(val: MetricValue): string {
  if (isMaskedValue(val)) return '**'
  const num = toMetricNumber(val)
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return num.toLocaleString()
  return String(num)
}

export function formatCost(val: MetricValue): string {
  if (isMaskedValue(val)) return '**'
  return '¥' + toMetricNumber(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCtr(val: MetricValue): string {
  if (isMaskedValue(val)) return '**'
  return (toMetricNumber(val) * 100).toFixed(2) + '%'
}

export function formatPercent(val: MetricValue): string {
  if (isMaskedValue(val)) return '**'
  return `${(toMetricNumber(val) * 100).toFixed(2)}%`
}
