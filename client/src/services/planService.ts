import { request } from './api/client'
import { Plan } from '@/types'

export const planService = {
  async getPlans(month?: string): Promise<Plan[]> {
    return request.get('/v1/plans', { params: { month } })
  },

  async getTop5Plans(month?: string): Promise<Plan[]> {
    return request.get('/v1/plans/top5', { params: { month } })
  },

  async createPlan(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan> {
    return request.post('/v1/plans', plan)
  },

  async updatePlan(id: number, plan: Partial<Plan>): Promise<Plan> {
    return request.put(`/v1/plans/${id}`, plan)
  },

  async deletePlan(id: number): Promise<void> {
    await request.delete(`/v1/plans/${id}`)
  },
}
