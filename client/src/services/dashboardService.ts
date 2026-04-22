import { request } from './api/client'
import { DailyOverview, WeeklyOverview, MonthlyOverview, RankingsData } from '@/types'

export const dashboardService = {
  async getDailyOverview(): Promise<DailyOverview> {
    return request.get<DailyOverview>('/v1/overview/daily')
  },

  async getWeeklyOverview(): Promise<WeeklyOverview> {
    return request.get<WeeklyOverview>('/v1/overview/weekly')
  },

  async getMonthlyOverview(): Promise<MonthlyOverview> {
    return request.get<MonthlyOverview>('/v1/overview/monthly')
  },

  async getRankings(): Promise<RankingsData> {
    return request.get<RankingsData>('/v1/overview/rankings')
  },
}
