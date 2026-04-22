import { request } from './api/client'
import { RawData, UploadResult } from '@/types'

export const dataManageService = {
  async getRecords(params?: {
    channel?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }): Promise<{
    total: number
    records: RawData[]
  }> {
    return request.get('/v1/data/records', { params })
  },

  async getChannels(): Promise<string[]> {
    return request.get<string[]>('/v1/data/channels')
  },

  async getUploadLogs(params?: {
    page?: number
    pageSize?: number
  }): Promise<{
    total: number
    logs: Array<{
      id: number
      filename: string
      recordCount: number
      insertedCount: number
      updatedCount: number
      failedCount: number
      uploadedBy?: string
      uploadedAt: string
    }>
  }> {
    return request.get('/v1/data/upload-logs', { params })
  },
}
