import { request } from './api/client'
import type {
  CreativeListResult,
  CreativeUploadResult,
  CreativePerformance,
} from '@/types'

export const creativeService = {
  /** 素材文件访问地址（媒体标签无法带 Authorization 头，用 token 查询参数） */
  fileUrl(storedName: string): string {
    const token = localStorage.getItem('token') || ''
    return `/api/v1/creatives/file/${storedName}?token=${encodeURIComponent(token)}`
  },

  async upload(files: File[], channel: string, campaignId?: string, title?: string): Promise<CreativeUploadResult> {
    const formData = new FormData()
    for (const f of files) formData.append('files', f)
    formData.append('channel', channel)
    if (campaignId) formData.append('campaignId', campaignId)
    if (title) formData.append('title', title)
    return request.post('/v1/creatives/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 大文件/压缩包上传放宽到 5 分钟
    })
  },

  async list(params?: {
    status?: string
    channel?: string
    campaign_id?: string
    page?: number
    pageSize?: number
  }): Promise<CreativeListResult> {
    return request.get('/v1/creatives/list', { params })
  },

  async pendingCount(): Promise<{ count: number }> {
    return request.get('/v1/creatives/pending-count')
  },

  /** 渠道主清单（admin 全量，渠道用户自动按权限过滤） */
  async getChannels(): Promise<string[]> {
    return request.get('/v1/creatives/channels')
  },

  async review(id: number, action: 'approve' | 'reject', comment?: string): Promise<void> {
    return request.post(`/v1/creatives/${id}/review`, { action, comment })
  },

  async resubmit(id: number): Promise<void> {
    return request.post(`/v1/creatives/${id}/resubmit`)
  },

  async setCampaigns(id: number, campaignIds: string[]): Promise<void> {
    return request.put(`/v1/creatives/${id}/campaigns`, { campaignIds })
  },

  async remove(id: number): Promise<void> {
    return request.delete(`/v1/creatives/${id}`)
  },

  async performance(id: number, startDate?: string, endDate?: string): Promise<CreativePerformance> {
    return request.get(`/v1/creatives/${id}/performance`, {
      params: { start_date: startDate, end_date: endDate },
    })
  },
}
