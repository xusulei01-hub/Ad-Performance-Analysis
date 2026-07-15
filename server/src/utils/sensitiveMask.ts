export const MASKED_METRIC = '**'

export function shouldMaskSensitiveMetrics(isNonAdmin = false): boolean {
  const raw = process.env.MASK_SENSITIVE_METRICS || ''
  return isNonAdmin && ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

export function maskMetric<T>(value: T, shouldMask: boolean): T | typeof MASKED_METRIC {
  return shouldMask ? MASKED_METRIC : value
}
