import { Router } from 'express'
import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'
import { getCurrentTarget, DEFAULT_TARGETS } from './targetRoutes'

const router = Router()

/**
 * 聚合指标，ROI 按业务公式计算：合计开户 * 3100 / 合计花费
 */
function buildWhere(startDate: Date, endDate: Date, channelFilter?: string[]) {
  const where: any = {
    recordDate: {
      gte: startDate,
      lte: endDate,
    },
  }
  if (channelFilter && channelFilter.length > 0) {
    where.channel = { in: channelFilter }
  }
  return where
}

async function aggregateMetrics(startDate: Date, endDate: Date, channelFilter?: string[]) {
  const where = buildWhere(startDate, endDate, channelFilter)

  const agg = await prisma.rawData.aggregate({
    where,
    _sum: {
      cost: true,
      activations: true,
      accounts: true,
      formalActivations: true,
      leads: true,
      impressions: true,
      clicks: true,
      downloads: true,
    },
  })

  const totalCost = agg._sum.cost ?? 0
  const totalActivations = agg._sum.activations ?? 0
  const totalAccounts = agg._sum.accounts ?? 0
  const totalFormal = agg._sum.formalActivations ?? 0
  const totalLeads = agg._sum.leads ?? 0
  const totalImpressions = agg._sum.impressions ?? 0
  const totalClicks = agg._sum.clicks ?? 0
  const totalDownloads = agg._sum.downloads ?? 0

  return {
    cost: totalCost,
    activations: totalActivations,
    accounts: totalAccounts,
    formalActivations: totalFormal,
    leads: totalLeads,
    impressions: totalImpressions,
    clicks: totalClicks,
    downloads: totalDownloads,
    ctr: totalImpressions > 0 ? Number((totalClicks / totalImpressions).toFixed(4)) : 0,
    roi: totalCost > 0 ? Number(((totalAccounts * 3100) / totalCost).toFixed(4)) : 0,
    cpa: totalActivations > 0 ? Number((totalCost / totalActivations).toFixed(2)) : 0,
  }
}

/** 按日期聚合指标（用于趋势图） */
async function getDailyTrends(startDate: Date, endDate: Date, channelFilter?: string[]) {
  const where = buildWhere(startDate, endDate, channelFilter)

  const dailyRaw = await prisma.rawData.groupBy({
    by: ['recordDate'],
    where,
    _sum: {
      cost: true,
      activations: true,
      accounts: true,
      formalActivations: true,
      leads: true,
      impressions: true,
      clicks: true,
      downloads: true,
    },
    orderBy: { recordDate: 'asc' },
  })

  return dailyRaw.map((r) => ({
    date: dayjs(r.recordDate).format('YYYY-MM-DD'),
    cost: r._sum.cost ?? 0,
    activations: r._sum.activations ?? 0,
    accounts: r._sum.accounts ?? 0,
    formalActivations: r._sum.formalActivations ?? 0,
    leads: r._sum.leads ?? 0,
    impressions: r._sum.impressions ?? 0,
    clicks: r._sum.clicks ?? 0,
    downloads: r._sum.downloads ?? 0,
    ctr: (r._sum.impressions ?? 0) > 0
      ? Number(((r._sum.clicks ?? 0) / (r._sum.impressions ?? 0)).toFixed(4))
      : 0,
    roi: (r._sum.cost ?? 0) > 0
      ? Number((((r._sum.accounts ?? 0) * 3100) / (r._sum.cost ?? 0)).toFixed(4))
      : 0,
  }))
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0
  return Number(((current - previous) / previous).toFixed(4))
}

/** 获取本周一和本周日（中国习惯，周一开始） */
function getWeekRange(now: dayjs.Dayjs) {
  const dayOfWeek = now.day() // 0=周日, 1=周一, ..., 6=周六
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = now.subtract(daysSinceMonday, 'day').startOf('day')
  const endOfWeek = startOfWeek.add(6, 'day').endOf('day')
  return { startOfWeek, endOfWeek }
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
        formalActivations: yesterdayMetrics.formalActivations,
        leads: yesterdayMetrics.leads,
        ctr: yesterdayMetrics.ctr,
        roi: yesterdayMetrics.roi,
        costChange: calcChange(yesterdayMetrics.cost, dayBeforeMetrics.cost),
        activationsChange: calcChange(yesterdayMetrics.activations, dayBeforeMetrics.activations),
        accountsChange: calcChange(yesterdayMetrics.accounts, dayBeforeMetrics.accounts),
        roiChange: calcChange(yesterdayMetrics.roi, dayBeforeMetrics.roi),
        cpa: yesterdayMetrics.cpa,
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
    const { startOfWeek, endOfWeek } = getWeekRange(now)

    const [metrics, target, dailyTrends] = await Promise.all([
      aggregateMetrics(startOfWeek.toDate(), endOfWeek.toDate()),
      getCurrentTarget('weekly'),
      getDailyTrends(startOfWeek.toDate(), endOfWeek.toDate()),
    ])

    const t = target || DEFAULT_TARGETS.weekly

    res.json({
      success: true,
      data: {
        startDate: startOfWeek.format('YYYY-MM-DD'),
        endDate: endOfWeek.format('YYYY-MM-DD'),
        cost: metrics.cost,
        activations: metrics.activations,
        accounts: metrics.accounts,
        formalActivations: metrics.formalActivations,
        leads: metrics.leads,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        downloads: metrics.downloads,
        ctr: metrics.ctr,
        roi: metrics.roi,
        cpa: metrics.cpa,
        targetCost: t.targetCost,
        targetActivations: t.targetActivations,
        targetAccounts: t.targetAccounts,
        targetRoi: t.targetRoi,
        dailyTrends,
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

    const [metrics, target, dailyTrends] = await Promise.all([
      aggregateMetrics(startOfMonth.toDate(), endOfMonth.toDate()),
      getCurrentTarget('monthly'),
      getDailyTrends(startOfMonth.toDate(), endOfMonth.toDate()),
    ])

    const t = target || DEFAULT_TARGETS.monthly

    res.json({
      success: true,
      data: {
        month: startOfMonth.format('YYYY-MM'),
        cost: metrics.cost,
        activations: metrics.activations,
        accounts: metrics.accounts,
        formalActivations: metrics.formalActivations,
        leads: metrics.leads,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        downloads: metrics.downloads,
        ctr: metrics.ctr,
        roi: metrics.roi,
        cpa: metrics.cpa,
        targetCost: t.targetCost,
        targetActivations: t.targetActivations,
        targetAccounts: t.targetAccounts,
        targetRoi: t.targetRoi,
        dailyTrends,
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

    const channelGroups = await prisma.rawData.groupBy({
      by: ['channel'],
      where: {
        recordDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: {
        cost: true,
        activations: true,
        accounts: true,
      },
    })

    const channelData = channelGroups.map((g) => ({
      channel: g.channel,
      cost: g._sum.cost ?? 0,
      roi: (g._sum.cost ?? 0) > 0
        ? Number((((g._sum.accounts ?? 0) * 3100) / (g._sum.cost ?? 0)).toFixed(4))
        : 0,
      cpa: (g._sum.activations ?? 0) > 0
        ? Number(((g._sum.cost ?? 0) / (g._sum.activations ?? 0)).toFixed(2))
        : 0,
      activations: g._sum.activations ?? 0,
    }))

    const costRanking = channelData
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
      .map(({ channel, cost }) => ({ channel, cost }))

    const performanceRanking = channelData
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10)

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
