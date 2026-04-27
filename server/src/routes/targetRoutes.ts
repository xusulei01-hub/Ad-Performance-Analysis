import { Router } from 'express'
import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'

const router = Router()

/** 获取本周范围（周一 ~ 周日） */
function getWeekRange(now: dayjs.Dayjs) {
  const dayOfWeek = now.day() // 0=周日, 1=周一, ..., 6=周六
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = now.subtract(daysSinceMonday, 'day').startOf('day')
  const endOfWeek = startOfWeek.add(6, 'day').endOf('day')
  return { startOfWeek, endOfWeek }
}

/** 获取当前周期目标，找不到则返回 null */
export async function getCurrentTarget(periodType: 'weekly' | 'monthly') {
  const now = dayjs()

  let periodStart: dayjs.Dayjs
  let periodEnd: dayjs.Dayjs

  if (periodType === 'weekly') {
    const { startOfWeek, endOfWeek } = getWeekRange(now)
    periodStart = startOfWeek
    periodEnd = endOfWeek
  } else {
    periodStart = now.startOf('month')
    periodEnd = now.endOf('month')
  }

  const target = await prisma.target.findFirst({
    where: {
      periodType,
      periodStart: { gte: periodStart.toDate(), lte: periodStart.endOf('day').toDate() },
    },
  })

  return target
}

/** 兜底默认值 */
export const DEFAULT_TARGETS = {
  weekly: {
    targetCost: 1000000,
    targetActivations: 8000,
    targetAccounts: 5000,
    targetRoi: 1.5,
  },
  monthly: {
    targetCost: 5000000,
    targetActivations: 40000,
    targetAccounts: 25000,
    targetRoi: 1.5,
  },
}

// GET /api/v1/targets — 列表
router.get('/', async (req, res, next) => {
  try {
    const periodType = req.query.period_type as string | undefined
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20))

    const where: any = {}
    if (periodType) where.periodType = periodType

    const [total, targets] = await Promise.all([
      prisma.target.count({ where }),
      prisma.target.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    res.json({ success: true, data: { total, page, pageSize, targets } })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/targets/current — 当前周期目标
router.get('/current', async (req, res, next) => {
  try {
    const periodType = req.query.period_type as 'weekly' | 'monthly' | undefined

    if (!periodType || !['weekly', 'monthly'].includes(periodType)) {
      res.status(400).json({ success: false, message: 'period_type 必填，值为 weekly 或 monthly' })
      return
    }

    const target = await getCurrentTarget(periodType)
    const defaults = DEFAULT_TARGETS[periodType]

    res.json({
      success: true,
      data: {
        periodType,
        configured: !!target,
        targets: target
          ? {
              targetCost: target.targetCost,
              targetActivations: target.targetActivations,
              targetAccounts: target.targetAccounts,
              targetRoi: target.targetRoi,
            }
          : defaults,
      },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/targets — 创建或更新
router.post('/', async (req, res, next) => {
  try {
    const { periodType, periodStart, periodEnd, targetCost, targetActivations, targetAccounts, targetRoi } = req.body

    if (!periodType || !['weekly', 'monthly'].includes(periodType)) {
      res.status(400).json({ success: false, message: 'period_type 必填，值为 weekly 或 monthly' })
      return
    }
    if (!periodStart || !periodEnd) {
      res.status(400).json({ success: false, message: 'periodStart 和 periodEnd 必填' })
      return
    }

    const start = dayjs(periodStart).startOf('day').toDate()
    const end = dayjs(periodEnd).endOf('day').toDate()

    const existing = await prisma.target.findFirst({
      where: { periodType, periodStart: { gte: start, lte: dayjs(start).endOf('day').toDate() } },
    })

    let target
    if (existing) {
      target = await prisma.target.update({
        where: { id: existing.id },
        data: {
          periodEnd: end,
          targetCost: Number(targetCost) || 0,
          targetActivations: Number(targetActivations) || 0,
          targetAccounts: Number(targetAccounts) || 0,
          targetRoi: Number(targetRoi) || 0,
        },
      })
    } else {
      target = await prisma.target.create({
        data: {
          periodType,
          periodStart: start,
          periodEnd: end,
          targetCost: Number(targetCost) || 0,
          targetActivations: Number(targetActivations) || 0,
          targetAccounts: Number(targetAccounts) || 0,
          targetRoi: Number(targetRoi) || 0,
        },
      })
    }

    res.json({ success: true, data: target })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/targets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await prisma.target.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
