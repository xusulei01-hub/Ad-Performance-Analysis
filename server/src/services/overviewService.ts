import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'
import { getWeekRange } from '../utils/date'
import { calcChange, calcRoi, calcCtr, calcCpa } from '../utils/formulas'
import { getCurrentTarget } from './targetService'
import { DEFAULT_TARGETS } from '../constants'
import type { DailyTrendItem } from '../types'

function buildWhere(startDate: Date, endDate: Date, channelFilter?: string[] | null) {
  const where: any = {
    recordDate: { gte: startDate, lte: endDate },
  }
  if (channelFilter && channelFilter.length > 0) {
    where.channel = { in: channelFilter }
  } else if (channelFilter && channelFilter.length === 0) {
    where.channel = { in: [] } // 无可用渠道 → 空结果
  }
  return where
}

// 始终查询完整转化字段；渠道权限仍由上层过滤。
const SUM_FIELDS = {
  cost: true, activations: true, accounts: true, formalActivations: true,
  leads: true, impressions: true, clicks: true, downloads: true,
} as const

async function aggregateMetrics(startDate: Date, endDate: Date, channelFilter?: string[] | null, isNonAdmin = false) {
  const where = buildWhere(startDate, endDate, channelFilter)

  const agg = await prisma.rawData.aggregate({ where, _sum: SUM_FIELDS })

  const totalCost = agg._sum.cost ?? 0
  const realAccounts = agg._sum.accounts ?? 0
  const totalImpressions = agg._sum.impressions ?? 0
  const totalClicks = agg._sum.clicks ?? 0

  return {
    cost: totalCost,
    activations: agg._sum.activations ?? 0,
    accounts: realAccounts,
    formalActivations: agg._sum.formalActivations ?? 0,
    leads: agg._sum.leads ?? 0,
    impressions: totalImpressions,
    clicks: totalClicks,
    downloads: agg._sum.downloads ?? 0,
    ctr: calcCtr(totalClicks, totalImpressions),
    roi: calcRoi(realAccounts, totalCost), // ROI 用真实 accounts 计算
    cpa: calcCpa(totalCost, agg._sum.activations ?? 0),
  }
}

function buildChangeMetrics(current: Awaited<ReturnType<typeof aggregateMetrics>>, previous: Awaited<ReturnType<typeof aggregateMetrics>>, isNonAdmin = false) {
  return {
    costChange: calcChange(current.cost, previous.cost),
    activationsChange: calcChange(current.activations, previous.activations),
    accountsChange: calcChange(current.accounts, previous.accounts),
    roiChange: calcChange(current.roi, previous.roi),
    cpaChange: calcChange(current.cpa, previous.cpa),
    formalActivationsChange: calcChange(current.formalActivations, previous.formalActivations),
    leadsChange: calcChange(current.leads, previous.leads),
    ctrChange: calcChange(current.ctr, previous.ctr),
  }
}

async function getDailyTrends(startDate: Date, endDate: Date, channelFilter?: string[] | null, isNonAdmin = false): Promise<DailyTrendItem[]> {
  const where = buildWhere(startDate, endDate, channelFilter)

  const dailyRaw = await prisma.rawData.groupBy({
    by: ['recordDate'],
    where,
    _sum: SUM_FIELDS,
    orderBy: { recordDate: 'asc' },
  })

  return dailyRaw.map((r) => {
    const realAcc = r._sum.accounts ?? 0
    return {
      date: dayjs(r.recordDate).format('YYYY-MM-DD'),
      cost: r._sum.cost ?? 0,
      activations: r._sum.activations ?? 0,
      accounts: realAcc,
      formalActivations: r._sum.formalActivations ?? 0,
      leads: r._sum.leads ?? 0,
      impressions: r._sum.impressions ?? 0,
      clicks: r._sum.clicks ?? 0,
      downloads: r._sum.downloads ?? 0,
      ctr: calcCtr(r._sum.clicks ?? 0, r._sum.impressions ?? 0),
      roi: calcRoi(realAcc, r._sum.cost ?? 0),
    }
  })
}

export async function getDailyMetrics(channelFilter?: string[] | null, isNonAdmin = false) {
  const yesterday = dayjs().subtract(1, 'day')
  const dayBefore = yesterday.subtract(1, 'day')

  const [yesterdayMetrics, dayBeforeMetrics] = await Promise.all([
    aggregateMetrics(yesterday.startOf('day').toDate(), yesterday.endOf('day').toDate(), channelFilter, isNonAdmin),
    aggregateMetrics(dayBefore.startOf('day').toDate(), dayBefore.endOf('day').toDate(), channelFilter, isNonAdmin),
  ])

  return {
    date: yesterday.format('YYYY-MM-DD'),
    cost: yesterdayMetrics.cost,
    activations: yesterdayMetrics.activations,
    accounts: yesterdayMetrics.accounts,
    formalActivations: yesterdayMetrics.formalActivations,
    leads: yesterdayMetrics.leads,
    ctr: yesterdayMetrics.ctr,
    roi: yesterdayMetrics.roi,
    cpa: yesterdayMetrics.cpa,
    ...buildChangeMetrics(yesterdayMetrics, dayBeforeMetrics, isNonAdmin),
  }
}

export async function getWeeklyMetrics(channelFilter?: string[] | null, isNonAdmin = false) {
  const now = dayjs()
  const { startOfWeek, endOfWeek } = getWeekRange(now)
  const previousStartOfWeek = startOfWeek.subtract(7, 'day')
  const previousEndOfWeek = endOfWeek.subtract(7, 'day')

  const [metrics, previousMetrics, target, dailyTrends] = await Promise.all([
    aggregateMetrics(startOfWeek.toDate(), endOfWeek.toDate(), channelFilter, isNonAdmin),
    aggregateMetrics(previousStartOfWeek.toDate(), previousEndOfWeek.toDate(), channelFilter, isNonAdmin),
    getCurrentTarget('weekly'),
    getDailyTrends(startOfWeek.toDate(), endOfWeek.toDate(), channelFilter, isNonAdmin),
  ])

  const t = target || DEFAULT_TARGETS.weekly

  return {
    startDate: startOfWeek.format('YYYY-MM-DD'),
    endDate: endOfWeek.format('YYYY-MM-DD'),
    ...metrics,
    targetCost: t.targetCost,
    targetActivations: t.targetActivations,
    targetAccounts: isNonAdmin ? 0 : t.targetAccounts,
    targetRoi: t.targetRoi,
    ...buildChangeMetrics(metrics, previousMetrics, isNonAdmin),
    dailyTrends,
  }
}

export async function getMonthlyMetrics(channelFilter?: string[] | null, isNonAdmin = false) {
  const now = dayjs()
  const startOfMonth = now.startOf('month')
  const endOfMonth = now.endOf('month')
  const previousMonth = now.subtract(1, 'month')
  const previousStartOfMonth = previousMonth.startOf('month')
  const previousEndOfMonth = previousMonth.endOf('month')

  const [metrics, previousMetrics, target, dailyTrends] = await Promise.all([
    aggregateMetrics(startOfMonth.toDate(), endOfMonth.toDate(), channelFilter, isNonAdmin),
    aggregateMetrics(previousStartOfMonth.toDate(), previousEndOfMonth.toDate(), channelFilter, isNonAdmin),
    getCurrentTarget('monthly'),
    getDailyTrends(startOfMonth.toDate(), endOfMonth.toDate(), channelFilter, isNonAdmin),
  ])

  const t = target || DEFAULT_TARGETS.monthly

  return {
    month: startOfMonth.format('YYYY-MM'),
    ...metrics,
    targetCost: t.targetCost,
    targetActivations: t.targetActivations,
    targetAccounts: isNonAdmin ? 0 : t.targetAccounts,
    targetRoi: t.targetRoi,
    ...buildChangeMetrics(metrics, previousMetrics, isNonAdmin),
    dailyTrends,
  }
}

export async function getRankings(channelFilter?: string[] | null, isNonAdmin = false) {
  const now = dayjs()
  const startOfMonth = now.startOf('month').toDate()
  const endOfMonth = now.endOf('month').toDate()

  const where = buildWhere(startOfMonth, endOfMonth, channelFilter)

  const channelGroups = await prisma.rawData.groupBy({
    by: ['channel'],
    where,
    _sum: { cost: true, activations: true, accounts: true },
  })

  const channelData = channelGroups.map((g) => {
    const realAcc = g._sum.accounts ?? 0
    return {
      channel: g.channel,
      cost: g._sum.cost ?? 0,
      roi: calcRoi(realAcc, g._sum.cost ?? 0),
      cpa: calcCpa(g._sum.cost ?? 0, g._sum.activations ?? 0),
      activations: g._sum.activations ?? 0,
    }
  })

  const costRanking = channelData
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)
    .map(({ channel, cost }) => ({ channel, cost }))

  const performanceRanking = channelData
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10)

  return { costRanking, performanceRanking }
}
