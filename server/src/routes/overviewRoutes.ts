import { Router } from 'express'

const router = Router()

// GET /api/v1/overview/daily - 昨日数据
router.get('/daily', (req, res) => {
  res.json({ success: true, message: 'Daily overview endpoint - TODO' })
})

// GET /api/v1/overview/weekly - 本周数据
router.get('/weekly', (req, res) => {
  res.json({ success: true, message: 'Weekly overview endpoint - TODO' })
})

// GET /api/v1/overview/monthly - 本月数据
router.get('/monthly', (req, res) => {
  res.json({ success: true, message: 'Monthly overview endpoint - TODO' })
})

// GET /api/v1/overview/rankings - 排名数据
router.get('/rankings', (req, res) => {
  res.json({ success: true, message: 'Rankings endpoint - TODO' })
})

export default router
