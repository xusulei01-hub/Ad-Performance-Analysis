import { request } from './api/client'
import { OverviewData, RankingItem } from '@/types'

export const dashboardService = {
  async getDailyOverview(): Promise<OverviewData> {
    return request.get<OverviewData>('/v1/overview/daily')
  },

  async getWeeklyOverview(): Promise<OverviewData> {
    return request.get<OverviewData>('/v1/overview/weekly')
  },

  async getMonthlyOverview(): Promise<OverviewData> {
    return request.get<OverviewData>('/v1/overview/monthly')
  },

  async getRankings(): Promise<{
    costRanking: RankingItem[]
    performanceRanking: RankingItem[]
  }> {
    return request.get('/v1/overview/rankings')
  },
}
