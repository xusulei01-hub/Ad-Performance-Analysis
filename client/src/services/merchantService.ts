import { request } from './api/client'
import {
  MerchantData,
  MerchantUploadResult,
  MerchantMapping,
  MerchantInfo,
  MerchantReport,
  ChannelReport,
} from '@/types'

export const merchantService = {
  async uploadFile(file: File): Promise<MerchantUploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/v1/merchants/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  async getRecords(params?: {
    qsId?: string
    channel?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }): Promise<{
    total: number
    page: number
    pageSize: number
    records: MerchantData[]
  }> {
    return request.get('/v1/merchants/records', { params })
  },

  async getMerchants(): Promise<MerchantInfo[]> {
    return request.get<MerchantInfo[]>('/v1/merchants/merchants')
  },

  async getChannels(): Promise<string[]> {
    return request.get<string[]>('/v1/merchants/channels')
  },

  async getMerchantReport(params?: {
    start_date?: string
    end_date?: string
    qs_id?: string
    channel?: string
  }): Promise<MerchantReport> {
    return request.get('/v1/merchants/reports/merchant', { params })
  },

  async getChannelReport(params?: {
    start_date?: string
    end_date?: string
    qs_id?: string
    channel?: string
  }): Promise<ChannelReport> {
    return request.get('/v1/merchants/reports/channel', { params })
  },

  async getMerchantMappings(): Promise<MerchantMapping[]> {
    return request.get<MerchantMapping[]>('/v1/merchants/merchant-mappings')
  },

  async createMerchantMapping(qsId: string, merchantName: string): Promise<MerchantMapping> {
    return request.post('/v1/merchants/merchant-mappings', { qsId, merchantName })
  },

  async deleteMerchantMapping(id: number): Promise<void> {
    return request.delete(`/v1/merchants/merchant-mappings/${id}`)
  },
}
