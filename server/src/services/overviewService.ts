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

async function aggregateMetrics(startDate: Date, endDate: Date, channelFilter?: string[] | null, isNonAdmin = false) {
  const where = buildWhere(startDate, endDate, channelFilter)

  // 非管理员的 _sum 排除 leads 和 accounts
  const sumFields: any = isNonAdmin
    ? { cost: true, activations: true, formalActivations: true, impressions: true, clicks: true, downloads: true }
    : { cost: true, activations: true, accounts: true, formalActivations: true, leads: true, impressions: true, clicks: true, downloads: true }

  const agg = await prisma.rawData.aggregate({ where, _sum: sumFields })

  const totalCost = agg._sum.cost ?? 0
  const totalActivations = agg._sum.activations ?? 0
  const totalAccounts = isNonAdmin ? 0 : (agg._sum.accounts ?? 0)
  const totalImpressions = agg._sum.impressions ?? 0
  const totalClicks = agg._sum.clicks ?? 0

  return {
    cost: totalCost,
    activations: totalActivations,
    accounts: totalAccounts,
    formalActivations: agg._sum.formalActivations ?? 0,
    leads: isNonAdmin ? 0 : (agg._sum.leads ?? 0),
    impressions: totalImpressions,
    clicks: totalClicks,
    downloads: agg._sum.downloads ?? 0,
    ctr: calcCtr(totalClicks, totalImpressions),
    roi: calcRoi(totalAccounts, totalCost),
    cpa: calcCpa(totalCost, totalActivations),
  }
}

async function getDailyTrends(startDate: Date, endDate: Date, channelFilter?: string[] | null, isNonAdmin = false): Promise<DailyTrendItem[]> {
  const where = buildWhere(startDate, endDate, channelFilter)

  const sumFields: any = isNonAdmin
    ? { cost: true, activations: true, formalActivations: true, impressions: true, clicks: true, downloads: true }
    : { cost: true, activations: true, accounts: true, formalActivations: true, leads: true, impressions: true, clicks: true, downloads: true }

  const dailyRaw = await prisma.rawData.groupBy({
    by: ['recordDate'],
    where,
    _sum: sumFields,
    orderBy: { recordDate: 'asc' },
  })

  return dailyRaw.map((r) => ({
    date: dayjs(r.recordDate).format('YYYY-MM-DD'),
    cost: r._sum.cost ?? 0,
    activations: r._sum.activations ?? 0,
    accounts: isNonAdmin ? 0 : (r._sum.accounts ?? 0),
    formalActivations: r._sum.formalActivations ?? 0,
    leads: isNonAdmin ? 0 : (r._sum.leads ?? 0),
    impressions: r._sum.impressions ?? 0,
    clicks: r._sum.clicks ?? 0,
    downloads: r._sum.downloads ?? 0,
    ctr: calcCtr(r._sum.clicks ?? 0, r._sum.impressions ?? 0),
    roi: calcRoi(isNonAdmin ? 0 : (r._sum.accounts ?? 0), r._sum.cost ?? 0),
  }))
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
    costChange: calcChange(yesterdayMetrics.cost, dayBeforeMetrics.cost),
    activationsChange: calcChange(yesterdayMetrics.activations, dayBeforeMetrics.activations),
    accountsChange: isNonAdmin ? 0 : calcChange(yesterdayMetrics.accounts, dayBeforeMetrics.accounts),
    roiChange: calcChange(yesterdayMetrics.roi, dayBeforeMetrics.roi),
    cpa: yesterdayMetrics.cpa,
  }
}

export async function getWeeklyMetrics(channelFilter?: string[] | null, isNonAdmin = false) {
  const now = dayjs()
  const { startOfWeek, endOfWeek } = getWeekRange(now)

  const [metrics, target, dailyTrends] = await Promise.all([
    aggregateMetrics(startOfWeek.toDate(), endOfWeek.toDate(), channelFilter, isNonAdmin),
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
    dailyTrends,
  }
}

export async function getMonthlyMetrics(channelFilter?: string[] | null, isNonAdmin = false) {
  const now = dayjs()
  const startOfMonth = now.startOf('month')
  const endOfMonth = now.endOf('month')

  const [metrics, target, dailyTrends] = await Promise.all([
    aggregateMetrics(startOfMonth.toDate(), endOfMonth.toDate(), channelFilter, isNonAdmin),
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
    dailyTrends,
  }
}

export async function getRankings(channelFilter?: string[] | null, isNonAdmin = false) {
  const now = dayjs()
  const startOfMonth = now.startOf('month').toDate()
  const endOfMonth = now.endOf('month').toDate()

  const where = buildWhere(startOfMonth, endOfMonth, channelFilter)

  const sumFields: any = isNonAdmin
    ? { cost: true, activations: true }
    : { cost: true, activations: true, accounts: true }

  const channelGroups = await prisma.rawData.groupBy({
    by: ['channel'],
    where,
    _sum: sumFields,
  })

  const channelData = channelGroups.map((g) => ({
    channel: g.channel,
    cost: g._sum.cost ?? 0,
    roi: calcRoi(isNonAdmin ? 0 : (g._sum.accounts ?? 0), g._sum.cost ?? 0),
    cpa: calcCpa(g._sum.cost ?? 0, g._sum.activations ?? 0),
    activations: g._sum.activations ?? 0,
  }))

  const costRanking = channelData
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)
    .map(({ channel, cost }) => ({ channel, cost }))

  const performanceRanking = channelData
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10)

  return { costRanking, performanceRanking }
}
