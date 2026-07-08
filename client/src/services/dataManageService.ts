import { request } from './api/client'
import { RawData, UploadResult, UploadLog, ChannelMapping, CampaignSummary } from '@/types'

export const dataManageService = {
  // === 旧版双文件上传（保留兼容）===
  async uploadFiles(mediaFile: File, convFile: File, uploadedBy?: string): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('mediaFile', mediaFile)
    formData.append('convFile', convFile)
    if (uploadedBy) {
      formData.append('uploadedBy', uploadedBy)
    }
    return request.post('/v1/data/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // === 新版上传：转化表 + 按渠道媒体表 ===

  /** 上传转化数据表（仅管理员） */
  async uploadConvFile(file: File): Promise<{
    filename: string
    totalRecords: number
    insertedCount: number
    updatedCount: number
  }> {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/v1/data/upload-conv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** 按渠道上传媒体数据表 */
  async uploadMediaFile(file: File, channel: string): Promise<{
    filename: string
    channel: string
    totalRecords: number
    matchedCount: number
    insertedCount: number
    updatedCount: number
    unmatchedCount: number
  }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('channel', channel)
    return request.post('/v1/data/upload-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  async getRecords(params?: {
    channel?: string
    startDate?: string
    endDate?: string
    start_date?: string
    end_date?: string
    campaignId?: string
    campaign_id?: string
    previous_start_date?: string
    previous_end_date?: string
    page?: number
    pageSize?: number
    sort_by?: string
    sort_order?: string
  }): Promise<{
    total: number
    page: number
    pageSize: number
    records: RawData[]
  }> {
    const query = params
      ? {
          ...params,
          start_date: params.start_date ?? params.startDate,
          end_date: params.end_date ?? params.endDate,
          campaign_id: params.campaign_id ?? params.campaignId,
          page_size: params.pageSize,
        }
      : undefined
    return request.get('/v1/data/records', { params: query })
  },

  async getCampaignSummary(params?: {
    channel?: string
    startDate?: string
    endDate?: string
    start_date?: string
    end_date?: string
    campaignId?: string
    campaign_id?: string
    previous_start_date?: string
    previous_end_date?: string
    page?: number
    pageSize?: number
    sort_by?: string
    sort_order?: string
  }): Promise<{
    total: number
    page: number
    pageSize: number
    records: CampaignSummary[]
  }> {
    const query = params
      ? {
          ...params,
          start_date: params.start_date ?? params.startDate,
          end_date: params.end_date ?? params.endDate,
          campaign_id: params.campaign_id ?? params.campaignId,
          page_size: params.pageSize,
        }
      : undefined
    return request.get('/v1/data/campaign-summary', { params: query })
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

  async getChannelMappings(): Promise<ChannelMapping[]> {
    return request.get<ChannelMapping[]>('/v1/data/channel-mappings')
  },

  async createChannelMapping(sourceName: string, targetName: string): Promise<ChannelMapping> {
    return request.post('/v1/data/channel-mappings', { sourceName, targetName })
  },

  async deleteChannelMapping(id: number): Promise<void> {
    return request.delete(`/v1/data/channel-mappings/${id}`)
  },

  async rollbackUpload(id: number): Promise<{ deletedCount: number; message: string }> {
    return request.delete(`/v1/data/upload-logs/${id}/rollback`)
  },
}
