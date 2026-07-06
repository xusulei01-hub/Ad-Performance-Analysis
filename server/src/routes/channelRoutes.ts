import { Router } from 'express'
import dayjs from 'dayjs'
import * as channelService from '../services/channelService'
import { resolveUserChannels } from '../middleware/authorize'

const router = Router()

// GET /api/v1/channels/:channel/metrics?start_date=...&end_date=...
router.get('/:channel/metrics', async (req, res, next) => {
  try {
    const requestedChannels = req.params.channel.split(',').filter(Boolean)
    const startDate = req.query.start_date ? String(req.query.start_date) : dayjs().subtract(6, 'day').format('YYYY-MM-DD')
    const endDate = req.query.end_date ? String(req.query.end_date) : dayjs().format('YYYY-MM-DD')

    // 渠道权限过滤
    const channels = resolveUserChannels(req, requestedChannels)
    if (channels !== null && channels.length === 0) {
      return res.json({ success: true, data: { channels: [], totalMetrics: {}, campaignMetrics: {}, dailyTrends: [], channelBreakdown: [] } })
    }

    const data = await channelService.getChannelMetrics(channels || requestedChannels, startDate, endDate, req.user?.role !== 'admin')
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/channels/:channel/campaigns/:campaignId/trends
router.get('/:channel/campaigns/:campaignId/trends', async (req, res, next) => {
  try {
    const channel = req.params.channel
    const campaignId = req.params.campaignId
    const startDate = req.query.start_date ? String(req.query.start_date) : dayjs().subtract(6, 'day').format('YYYY-MM-DD')
    const endDate = req.query.end_date ? String(req.query.end_date) : dayjs().format('YYYY-MM-DD')

    // 校验渠道权限
    const channels = resolveUserChannels(req, [channel])
    if (channels !== null && channels.length === 0) {
      return res.status(403).json({ success: false, message: '没有该渠道的访问权限' })
    }

    const data = await channelService.getCampaignTrends(channel, campaignId, startDate, endDate, req.user?.role !== 'admin')
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
