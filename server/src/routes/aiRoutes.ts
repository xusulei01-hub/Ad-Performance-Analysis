import { Router } from 'express'
import { analyzeDashboard, analyzeChannel, analyzeMerchant } from '../services/aiService'

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

// POST /api/v1/ai/analyze-channel
router.post('/analyze-channel', async (req, res, next) => {
  try {
    const { totalMetrics, campaignMetrics, dailyTrends, channelBreakdown, dateRange } = req.body

    if (!totalMetrics || !campaignMetrics || !dailyTrends || !channelBreakdown) {
      res.status(400).json({
        success: false,
        message: '缺少必填数据: totalMetrics, campaignMetrics, dailyTrends, channelBreakdown',
      })
      return
    }

    const analysis = await analyzeChannel({ totalMetrics, campaignMetrics, dailyTrends, channelBreakdown, dateRange })

    res.json({ success: true, data: { analysis } })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      res.status(504).json({ success: false, message: 'AI 分析超时，请稍后重试' })
      return
    }
    next(err)
  }
})

// POST /api/v1/ai/analyze-merchant
router.post('/analyze-merchant', async (req, res, next) => {
  try {
    const { merchantReport, channelReport, dateRange } = req.body

    if (!merchantReport || !channelReport) {
      res.status(400).json({
        success: false,
        message: '缺少必填数据: merchantReport, channelReport',
      })
      return
    }

    const analysis = await analyzeMerchant({ merchantReport, channelReport, dateRange })

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
