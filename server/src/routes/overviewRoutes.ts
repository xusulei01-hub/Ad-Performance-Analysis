import { Router } from 'express'
import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'

const router = Router()

async function aggregateMetrics(startDate: Date, endDate: Date, channelFilter?: string[]) {
  const where: any = {
    recordDate: {
      gte: startDate,
      lte: endDate,
    },
  }
  if (channelFilter && channelFilter.length > 0) {
    where.channel = { in: channelFilter }
  }

  const agg = await prisma.rawData.aggregate({
    where,
    _sum: {
      cost: true,
      activations: true,
      accounts: true,
    },
    _avg: {
      roi: true,
    },
  })

  return {
    cost: agg._sum.cost ?? 0,
    activations: agg._sum.activations ?? 0,
    accounts: agg._sum.accounts ?? 0,
    roi: agg._avg.roi ?? 0,
  }
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0
  return Number(((current - previous) / previous).toFixed(4))
}

// GET /api/v1/overview/daily
router.get('/daily', async (req, res, next) => {
  try {
    const yesterday = dayjs().subtract(1, 'day')
    const dayBefore = yesterday.subtract(1, 'day')

    const [yesterdayMetrics, dayBeforeMetrics] = await Promise.all([
      aggregateMetrics(yesterday.startOf('day').toDate(), yesterday.endOf('day').toDate()),
      aggregateMetrics(dayBefore.startOf('day').toDate(), dayBefore.endOf('day').toDate()),
    ])

    res.json({
      success: true,
      data: {
        date: yesterday.format('YYYY-MM-DD'),
        cost: yesterdayMetrics.cost,
        activations: yesterdayMetrics.activations,
        accounts: yesterdayMetrics.accounts,
        roi: yesterdayMetrics.roi,
        costChange: calcChange(yesterdayMetrics.cost, dayBeforeMetrics.cost),
        activationsChange: calcChange(yesterdayMetrics.activations, dayBeforeMetrics.activations),
        accountsChange: calcChange(yesterdayMetrics.accounts, dayBeforeMetrics.accounts),
        roiChange: calcChange(yesterdayMetrics.roi, dayBeforeMetrics.roi),
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/weekly
router.get('/weekly', async (req, res, next) => {
  try {
    const now = dayjs()
    const startOfWeek = now.startOf('week').add(1, 'day') // 周一
    const endOfWeek = now.endOf('week').add(1, 'day') // 周日

    const metrics = await aggregateMetrics(startOfWeek.toDate(), endOfWeek.toDate())

    res.json({
      success: true,
      data: {
        startDate: startOfWeek.format('YYYY-MM-DD'),
        endDate: endOfWeek.format('YYYY-MM-DD'),
        cost: metrics.cost,
        activations: metrics.activations,
        accounts: metrics.accounts,
        roi: metrics.roi,
        // 目标值可配置，先给默认值
        targetCost: 1000000,
        targetActivations: 8000,
        targetAccounts: 5000,
        targetRoi: 2.5,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/monthly
router.get('/monthly', async (req, res, next) => {
  try {
    const now = dayjs()
    const startOfMonth = now.startOf('month')
    const endOfMonth = now.endOf('month')

    const metrics = await aggregateMetrics(startOfMonth.toDate(), endOfMonth.toDate())

    res.json({
      success: true,
      data: {
        month: startOfMonth.format('YYYY-MM'),
        cost: metrics.cost,
        activations: metrics.activations,
        accounts: metrics.accounts,
        roi: metrics.roi,
        targetCost: 5000000,
        targetActivations: 40000,
        targetAccounts: 25000,
        targetRoi: 2.5,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/overview/rankings
router.get('/rankings', async (req, res, next) => {
  try {
    const now = dayjs()
    const startOfMonth = now.startOf('month').toDate()
    const endOfMonth = now.endOf('month').toDate()

    const [costRankingRaw, performanceRaw] = await Promise.all([
      prisma.rawData.groupBy({
        by: ['channel'],
        where: {
          recordDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { cost: true },
        orderBy: { _sum: { cost: 'desc' } },
        take: 10,
      }),
      prisma.rawData.groupBy({
        by: ['channel'],
        where: {
          recordDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { cost: true, activations: true },
        _avg: { roi: true },
        orderBy: { _avg: { roi: 'desc' } },
        take: 10,
      }),
    ])

    const costRanking = costRankingRaw.map((r) => ({
      channel: r.channel,
      cost: r._sum.cost ?? 0,
    }))

    const performanceRanking = performanceRaw.map((r) => ({
      channel: r.channel,
      roi: r._avg.roi ?? 0,
      cpa: (r._sum.activations ?? 0) > 0
        ? Number(((r._sum.cost ?? 0) / (r._sum.activations ?? 0)).toFixed(2))
        : 0,
      activations: r._sum.activations ?? 0,
    }))

    res.json({
      success: true,
      data: {
        costRanking,
        performanceRanking,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
