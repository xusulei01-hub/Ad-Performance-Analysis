import { Router } from 'express'
import * as overviewService from '../services/overviewService'

const router = Router()

// GET /api/v1/overview/daily
router.get('/daily', async (req, res, next) => {
  try {
    const data = await overviewService.getDailyMetrics()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/weekly
router.get('/weekly', async (req, res, next) => {
  try {
    const data = await overviewService.getWeeklyMetrics()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/monthly
router.get('/monthly', async (req, res, next) => {
  try {
    const data = await overviewService.getMonthlyMetrics()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/rankings
router.get('/rankings', async (req, res, next) => {
  try {
    const data = await overviewService.getRankings()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
