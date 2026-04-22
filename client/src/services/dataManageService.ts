import { request } from './api/client'
import { RawData, UploadResult, UploadLog } from '@/types'

export const dataManageService = {
  async getRecords(params?: {
    channel?: string
    startDate?: string
    endDate?: string
    campaignId?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<{
    total: number
    page: number
    pageSize: number
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
    page: number
    pageSize: number
    logs: UploadLog[]
  }> {
    return request.get('/v1/data/upload-logs', { params })
  },

  async uploadFile(file: File, uploadedBy?: string): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    if (uploadedBy) {
      formData.append('uploadedBy', uploadedBy)
    }
    return request.post('/v1/data/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}
