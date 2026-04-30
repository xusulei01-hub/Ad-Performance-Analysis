export function formatNumber(val: number): string {
  if (val >= 10000) return (val / 10000).toFixed(1) + '万'
  if (val >= 1000) return val.toLocaleString()
  return String(val)
}

export function formatCost(val: number): string {
  return '¥' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCtr(val: number): string {
  return (val * 100).toFixed(2) + '%'
}
