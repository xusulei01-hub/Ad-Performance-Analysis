import { Router } from 'express'
import * as aiReportService from '../services/aiReportService'
import { requireFields, requireEnum } from '../middleware/validate'

const router = Router()

// GET /api/v1/ai-reports — 列表
router.get('/', async (req, res, next) => {
  try {
    const type = req.query.type as string | undefined
    const reports = await aiReportService.listReports(type)
    res.json({ success: true, data: reports })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/ai-reports/stats — 存储统计
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await aiReportService.getStorageStats()
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/ai-reports/:id — 详情
router.get('/:id', async (req, res, next) => {
  try {
    const report = await aiReportService.getReport(Number(req.params.id))
    if (!report) {
      res.status(404).json({ success: false, message: '报告不存在' })
      return
    }
    res.json({ success: true, data: report })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/ai-reports — 创建
router.post(
  '/',
  requireFields('title', 'type', 'analysis'),
  requireEnum('type', ['dashboard', 'channel', 'merchant']),
  async (req, res, next) => {
    try {
      const { title, type, analysis, dataSnapshot } = req.body
      const { report, warning } = await aiReportService.createReport({
        title,
        type,
        analysis,
        dataSnapshot,
      })

      const response: any = { success: true, data: report }
      if (warning) response.warning = warning

      res.json(response)
    } catch (err: any) {
      if (err.statusCode === 429) {
        res.status(429).json({ success: false, message: err.message })
        return
      }
      next(err)
    }
  },
)

// DELETE /api/v1/ai-reports/:id — 删除
router.delete('/:id', async (req, res, next) => {
  try {
    await aiReportService.deleteReport(Number(req.params.id))
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
