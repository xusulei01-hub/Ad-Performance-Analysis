import { request } from './api/client'
import { AiReport } from '@/types'

export const aiReportService = {
  async getReports(type?: string): Promise<AiReport[]> {
    return request.get('/v1/ai-reports', { params: type ? { type } : undefined })
  },

  async getStats(): Promise<{ totalCount: number; totalChars: number; estimatedKb: number }> {
    return request.get('/v1/ai-reports/stats')
  },

  async getReport(id: number): Promise<AiReport> {
    return request.get(`/v1/ai-reports/${id}`)
  },

  async createReport(payload: {
    title: string
    type: string
    analysis: string
    dataSnapshot?: string
  }): Promise<{ report: AiReport; warning?: string }> {
    return request.post('/v1/ai-reports', payload)
  },

  async deleteReport(id: number): Promise<void> {
    return request.delete(`/v1/ai-reports/${id}`)
  },
}
