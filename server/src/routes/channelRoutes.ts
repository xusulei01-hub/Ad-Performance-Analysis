import { Router } from 'express'
import dayjs from 'dayjs'
import * as channelService from '../services/channelService'

const router = Router()

// GET /api/v1/channels/:channel/metrics?start_date=...&end_date=...
router.get('/:channel/metrics', async (req, res, next) => {
  try {
    const channels = req.params.channel.split(',').filter(Boolean)
    const startDate = req.query.start_date ? String(req.query.start_date) : dayjs().subtract(6, 'day').format('YYYY-MM-DD')
    const endDate = req.query.end_date ? String(req.query.end_date) : dayjs().format('YYYY-MM-DD')

    const data = await channelService.getChannelMetrics(channels, startDate, endDate)
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

    const data = await channelService.getCampaignTrends(channel, campaignId, startDate, endDate)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
