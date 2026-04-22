import { Router } from 'express'

const router = Router()

// GET /api/v1/channels/:channel/metrics - 渠道指标数据
router.get('/:channel/metrics', (req, res) => {
  res.json({ success: true, message: 'Channel metrics endpoint - TODO' })
})

export default router
