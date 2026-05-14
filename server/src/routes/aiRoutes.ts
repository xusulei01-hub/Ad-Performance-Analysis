import { Router } from 'express'
import { analyzeDashboard } from '../services/aiService'

const router = Router()

// POST /api/v1/ai/analyze
router.post('/analyze', async (req, res, next) => {
  try {
    const { daily, weekly, monthly, rankings } = req.body

    if (!daily || !weekly || !monthly || !rankings) {
      res.status(400).json({
        success: false,
        message: '缺少必填数据: daily, weekly, monthly, rankings',
      })
      return
    }

    const analysis = await analyzeDashboard({ daily, weekly, monthly, rankings })

    res.json({ success: true, data: { analysis } })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      res.status(504).json({ success: false, message: 'AI 分析超时，请稍后重试' })
      return
    }
    next(err)
  }
})

export default router
