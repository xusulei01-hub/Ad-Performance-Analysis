/**
 * 广告投放数据 — 媒体表解析后结构
 */
export interface ParsedMedia {
  channel: string
  recordDate: string
  campaignId: string
  campaignName: string | null
  impressions: number
  clicks: number
  cost: number
  downloads: number
}

/**
 * 广告投放数据 — 转化表解析后结构
 */
export interface ParsedConv {
  channel: string
  recordDate: string
  campaignId: string
  activations: number
  formalActivations: number
  leads: number
  accounts: number
}

/**
 * 媒体表 + 转化表匹配后的完整行
 */
export interface MatchedRow extends ParsedMedia {
  activations: number
  formalActivations: number
  leads: number
  accounts: number
  ctr: number
}

/**
 * 期商买断数据 — 解析后结构
 */
export interface ParsedMerchantRow {
  userId: string
  qsId: string
  channel: string
  leadDate: string
  accountDate: string | null
}

/**
 * 通用分页结果
 */
export interface PaginatedResult<T> {
  total: number
  page: number
  pageSize: number
  records: T[]
}

/**
 * 指标汇总
 */
export interface MetricSummary {
  cost: number
  activations: number
  accounts: number
  formalActivations: number
  leads: number
  impressions: number
  clicks: number
  downloads: number
  ctr: number
  roi: number
  cpa: number
}

/**
 * 每日趋势项
 */
export interface DailyTrendItem {
  date: string
  cost: number
  activations: number
  accounts: number
  formalActivations: number
  leads: number
  impressions: number
  clicks: number
  downloads: number
  ctr: number
  roi: number
}
