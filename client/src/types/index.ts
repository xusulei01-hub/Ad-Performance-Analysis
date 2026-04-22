export interface RawData {
  id?: number
  channel: string
  recordDate: string
  campaignId: string
  campaignName?: string
  impressions: number
  clicks: number
  cost: number
  downloads: number
  activations: number
  credits: number
  accounts: number
  roi: number
  createdAt?: string
  updatedAt?: string
}

export interface UploadResult {
  uploadId: number
  filename: string
  totalRecords: number
  insertedCount: number
  updatedCount: number
  failedCount: number
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
  roi: number
  costChange: number
  activationsChange: number
  accountsChange: number
  roiChange: number
}

export interface WeeklyOverview {
  startDate: string
  endDate: string
  cost: number
  activations: number
  accounts: number
  roi: number
  targetCost: number
  targetActivations: number
  targetAccounts: number
  targetRoi: number
}

export interface MonthlyOverview {
  month: string
  cost: number
  activations: number
  accounts: number
  roi: number
  targetCost: number
  targetActivations: number
  targetAccounts: number
  targetRoi: number
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

export interface ChannelMetrics {
  channels: string[]
  dateRange: DateRange
  totalMetrics: {
    cost: number
    activations: number
    accounts: number
    roi: number
  }
  campaignMetrics: {
    cost: Array<{ campaignId: string; campaignName: string | null; cost: number }>
    activations: Array<{ campaignId: string; campaignName: string | null; activations: number }>
    accounts: Array<{ campaignId: string; campaignName: string | null; accounts: number }>
    roi: Array<{ campaignId: string; campaignName: string | null; roi: number }>
  }
  dailyTrends: Array<{
    date: string
    cost: number
    activations: number
    accounts: number
    roi: number
  }>
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

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: string
}
