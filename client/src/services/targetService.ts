import { request } from './api/client'
import { Target, CurrentTarget } from '@/types'

export const targetService = {
  async getTargets(params?: { period_type?: string; page?: number; pageSize?: number }): Promise<{ total: number; page: number; pageSize: number; targets: Target[] }> {
    return request.get('/v1/targets', { params })
  },

  async getCurrentTarget(periodType: 'weekly' | 'monthly'): Promise<CurrentTarget> {
    return request.get('/v1/targets/current', { params: { period_type: periodType } })
  },

  async createOrUpdateTarget(payload: {
    periodType: string
    periodStart: string
    periodEnd: string
    targetCost: number
    targetActivations: number
    targetAccounts: number
    targetRoi: number
  }): Promise<Target> {
    return request.post('/v1/targets', payload)
  },

  async deleteTarget(id: number): Promise<void> {
    return request.delete(`/v1/targets/${id}`)
  },
}
