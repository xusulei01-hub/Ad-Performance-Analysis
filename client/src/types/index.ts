export interface RawData {
  id?: number
  channel: string
  recordDate: string
  campaignId: string
  campaignName?: string | null
  impressions: number
  clicks: number
  cost: number
  downloads: number
  activations: number
  formalActivations: number
  leads: number
  accounts: number
  ctr: number
  createdAt?: string
  updatedAt?: string
}

export interface UploadResult {
  uploadId: number
  filename: string
  totalRecords: number
  mediaRows: number
  convRows: number
  insertedCount: number
  updatedCount: number
  failedCount: number
  unmatchedMediaCount: number
  unmatchedConvCount: number
  preview: RawData[]
}

export interface DateRange {
  startDate: string
  endDate: string
}

export interface DailyOverview {
  date: string
  cost: number
  activations: number
  accounts: number
  formalActivations: number
  leads: number
  ctr: number
  roi: number
  cpa: number
  costChange: number
  activationsChange: number
  accountsChange: number
  roiChange: number
}

export interface DailyTrend {
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

export interface WeeklyOverview {
  startDate: string
  endDate: string
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
  targetCost: number
  targetActivations: number
  targetAccounts: number
  targetRoi: number
  dailyTrends: DailyTrend[]
}

export interface MonthlyOverview {
  month: string
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
  targetCost: number
  targetActivations: number
  targetAccounts: number
  targetRoi: number
  dailyTrends: DailyTrend[]
}

export interface RankingItem {
  channel: string
  cost?: number
  roi?: number
  cpa?: number
  activations?: number
}

export interface RankingsData {
  costRanking: RankingItem[]
  performanceRanking: RankingItem[]
}

export interface ChannelBreakdownItem {
  channel: string
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

export interface ChannelMetrics {
  channels: string[]
  dateRange: DateRange
  totalMetrics: {
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
  campaignMetrics: {
    cost: Array<{ campaignId: string; campaignName: string | null; cost: number }>
    activations: Array<{ campaignId: string; campaignName: string | null; activations: number }>
    accounts: Array<{ campaignId: string; campaignName: string | null; accounts: number }>
    roi: Array<{ campaignId: string; campaignName: string | null; roi: number }>
  }
  dailyTrends: DailyTrend[]
  channelBreakdown: ChannelBreakdownItem[]
}

export interface UploadLog {
  id: number
  filename: string
  recordCount: number
  insertedCount: number
  updatedCount: number
  failedCount: number
  errorDetails?: string
  uploadedBy?: string
  uploadedAt: string
}

export interface ChannelMapping {
  id: number
  sourceName: string
  targetName: string
  createdAt: string
}

export interface MerchantData {
  id: number
  userId: string
  qsId: string
  channel: string
  leadDate: string
  accountDate: string | null
  merchantName?: string | null
  createdAt: string
  updatedAt: string
}

export interface MerchantUploadResult {
  filename: string
  totalRecords: number
  insertedCount: number
  updatedCount: number
}

export interface MerchantMapping {
  id: number
  qsId: string
  merchantName: string
  createdAt: string
}

export interface MerchantInfo {
  qsId: string
  merchantName: string
  count: number
}

export interface MerchantReportItem {
  qsId: string
  merchantName: string
  leads: number
  accounts: number
  cost: number
  accountRate: number
  accountCost: number
}

export interface MerchantReport {
  dateRange: DateRange
  report: MerchantReportItem[]
}

export interface ChannelReportItem {
  channel: string
  leads: number
  accounts: number
  accountRate: number
}

export interface ChannelReport {
  dateRange: DateRange
  report: ChannelReportItem[]
}

export interface Milestone {
  id: number
  planId: number
  title: string
  dueDate: string
  completed: boolean
  sortOrder: number
}

export interface Plan {
  id: number
  title: string
  content?: string | null
  priority: number
  status: string
  startDate: string
  endDate: string
  progress: number
  tag?: string | null
  tagIcon?: string | null
  createdAt: string
  updatedAt: string
  milestones: Milestone[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: string
}
