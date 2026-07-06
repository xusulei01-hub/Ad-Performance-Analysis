import { Router } from 'express'
import * as overviewService from '../services/overviewService'
import { resolveUserChannels } from '../middleware/authorize'

const router = Router()

// GET /api/v1/overview/daily
router.get('/daily', async (req, res, next) => {
  try {
    const channels = resolveUserChannels(req, undefined)
    const isNonAdmin = req.user?.role !== 'admin'
    const data = await overviewService.getDailyMetrics(channels, isNonAdmin)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/weekly
router.get('/weekly', async (req, res, next) => {
  try {
    const channels = resolveUserChannels(req, undefined)
    const isNonAdmin = req.user?.role !== 'admin'
    const data = await overviewService.getWeeklyMetrics(channels, isNonAdmin)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/monthly
router.get('/monthly', async (req, res, next) => {
  try {
    const channels = resolveUserChannels(req, undefined)
    const isNonAdmin = req.user?.role !== 'admin'
    const data = await overviewService.getMonthlyMetrics(channels, isNonAdmin)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/rankings
router.get('/rankings', async (req, res, next) => {
  try {
    const channels = resolveUserChannels(req, undefined)
    const isNonAdmin = req.user?.role !== 'admin'
    const data = await overviewService.getRankings(channels, isNonAdmin)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
