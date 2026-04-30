import { REVENUE_PER_ACCOUNT } from '../constants'

/**
 * 未知值转数字
 */
export function toNum(v: unknown): number {
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

/**
 * 计算 ROI：开户数 × 单账户收益 / 花费
 */
export function calcRoi(accounts: number, cost: number): number {
  return cost > 0 ? Number(((accounts * REVENUE_PER_ACCOUNT) / cost).toFixed(4)) : 0
}

/**
 * 计算 CTR：点击 / 曝光
 */
export function calcCtr(clicks: number, impressions: number): number {
  return impressions > 0 ? Number((clicks / impressions).toFixed(4)) : 0
}

/**
 * 计算 CPA：花费 / 激活
 */
export function calcCpa(cost: number, activations: number): number {
  return activations > 0 ? Number((cost / activations).toFixed(2)) : 0
}

/**
 * 计算环比变化率
 */
export function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0
  return Number(((current - previous) / previous).toFixed(4))
}
