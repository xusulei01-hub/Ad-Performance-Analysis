import { request } from './api/client'
import { ChannelMetrics } from '@/types'

export const channelService = {
  async getChannels(): Promise<string[]> {
    return request.get<string[]>('/v1/data/channels')
  },

  async getChannelMetrics(
    channel: string,
    startDate: string,
    endDate: string
  ): Promise<ChannelMetrics> {
    return request.get<ChannelMetrics>(`/v1/channels/${channel}/metrics`, {
      params: { start_date: startDate, end_date: endDate },
    })
  },
}
