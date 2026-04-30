import { Router } from 'express'
import * as targetService from '../services/targetService'
import { requireFields, requireEnum } from '../middleware/validate'

const router = Router()

// GET /api/v1/targets — 列表
router.get('/', async (req, res, next) => {
  try {
    const data = await targetService.listTargets({
      periodType: req.query.period_type as string | undefined,
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.page_size) || undefined,
    })
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/targets/current — 当前周期目标
router.get('/current', requireEnum('period_type', ['weekly', 'monthly']), async (req, res, next) => {
  try {
    const periodType = req.query.period_type as 'weekly' | 'monthly'
    const data = await targetService.getCurrentTargetWithDefaults(periodType)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/targets — 创建或更新
router.post(
  '/',
  requireFields('periodType', 'periodStart', 'periodEnd'),
  requireEnum('periodType', ['weekly', 'monthly']),
  async (req, res, next) => {
    try {
      const { periodType, periodStart, periodEnd, targetCost, targetActivations, targetAccounts, targetRoi } = req.body

      const target = await targetService.createOrUpdateTarget({
        periodType,
        periodStart,
        periodEnd,
        targetCost,
        targetActivations,
        targetAccounts,
        targetRoi,
      })

      res.json({ success: true, data: target })
    } catch (err) {
      next(err)
    }
  }
)

// DELETE /api/v1/targets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await targetService.deleteTarget(Number(req.params.id))
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
