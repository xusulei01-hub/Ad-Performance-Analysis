import { Router } from 'express'
import dayjs from 'dayjs'
import * as merchantService from '../../services/merchantService'

const router = Router()

function extractFilters(req: any) {
  const startDate = req.query.start_date ? String(req.query.start_date) : dayjs().startOf('month').format('YYYY-MM-DD')
  const endDate = req.query.end_date ? String(req.query.end_date) : dayjs().format('YYYY-MM-DD')
  const qsIds = req.query.qs_id ? String(req.query.qs_id).split(',').filter(Boolean) : undefined
  const channels = req.query.channel ? String(req.query.channel).split(',').filter(Boolean) : undefined
  return { startDate, endDate, qsIds, channels }
}

// GET /api/v1/merchants/reports/merchant
router.get('/reports/merchant', async (req, res, next) => {
  try {
    const { startDate, endDate, qsIds, channels } = extractFilters(req)
    const data = await merchantService.getMerchantReport(startDate, endDate, qsIds, channels)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/merchants/reports/channel
router.get('/reports/channel', async (req, res, next) => {
  try {
    const { startDate, endDate, qsIds, channels } = extractFilters(req)
    const data = await merchantService.getChannelReport(startDate, endDate, qsIds, channels)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
