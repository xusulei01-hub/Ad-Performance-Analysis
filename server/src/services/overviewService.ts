import dayjs from 'dayjs'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { getWeekRange } from '../utils/date'
import { calcChange, calcRoi, calcCtr, calcCpa } from '../utils/formulas'
import { getCurrentTarget } from './targetService'
import { DEFAULT_TARGETS, REVENUE_PER_ACCOUNT } from '../constants'
import { maskMetric, shouldMaskSensitiveMetrics } from '../utils/sensitiveMask'
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
  const shouldMask = shouldMaskSensitiveMetrics(isNonAdmin)

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
      accounts: maskMetric(realAcc, shouldMask),
      formalActivations: r._sum.formalActivations ?? 0,
      leads: maskMetric(r._sum.leads ?? 0, shouldMask),
      impressions: r._sum.impressions ?? 0,
      clicks: r._sum.clicks ?? 0,
      downloads: r._sum.downloads ?? 0,
      ctr: calcCtr(r._sum.clicks ?? 0, r._sum.impressions ?? 0),
      roi: calcRoi(realAcc, r._sum.cost ?? 0),
    }
  })
}

export async function getDailyMetrics(channelFilter?: string[] | null, isNonAdmin = false) {
  const shouldMask = shouldMaskSensitiveMetrics(isNonAdmin)
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
    accounts: maskMetric(yesterdayMetrics.accounts, shouldMask),
    formalActivations: yesterdayMetrics.formalActivations,
    leads: maskMetric(yesterdayMetrics.leads, shouldMask),
    ctr: yesterdayMetrics.ctr,
    roi: yesterdayMetrics.roi,
    cpa: yesterdayMetrics.cpa,
    ...(() => {
      const changes = buildChangeMetrics(yesterdayMetrics, dayBeforeMetrics, isNonAdmin)
      return {
        ...changes,
        accountsChange: maskMetric(changes.accountsChange, shouldMask),
        leadsChange: maskMetric(changes.leadsChange, shouldMask),
      }
    })(),
  }
}

export async function getWeeklyMetrics(channelFilter?: string[] | null, isNonAdmin = false) {
  const shouldMask = shouldMaskSensitiveMetrics(isNonAdmin)
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
    accounts: maskMetric(metrics.accounts, shouldMask),
    leads: maskMetric(metrics.leads, shouldMask),
    targetCost: t.targetCost,
    targetActivations: t.targetActivations,
    targetAccounts: maskMetric(t.targetAccounts, shouldMask),
    targetRoi: t.targetRoi,
    ...(() => {
      const changes = buildChangeMetrics(metrics, previousMetrics, isNonAdmin)
      return {
        ...changes,
        accountsChange: maskMetric(changes.accountsChange, shouldMask),
        leadsChange: maskMetric(changes.leadsChange, shouldMask),
      }
    })(),
    dailyTrends,
  }
}

export async function getMonthlyMetrics(channelFilter?: string[] | null, isNonAdmin = false) {
  const shouldMask = shouldMaskSensitiveMetrics(isNonAdmin)
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
    accounts: maskMetric(metrics.accounts, shouldMask),
    leads: maskMetric(metrics.leads, shouldMask),
    targetCost: t.targetCost,
    targetActivations: t.targetActivations,
    targetAccounts: maskMetric(t.targetAccounts, shouldMask),
    targetRoi: t.targetRoi,
    ...(() => {
      const changes = buildChangeMetrics(metrics, previousMetrics, isNonAdmin)
      return {
        ...changes,
        accountsChange: maskMetric(changes.accountsChange, shouldMask),
        leadsChange: maskMetric(changes.leadsChange, shouldMask),
      }
    })(),
    dailyTrends,
  }
}

export async function getRankings(channelFilter?: string[] | null, isNonAdmin = false) {
  const now = dayjs()
  // 注意：SQLite 中 record_date 以毫秒时间戳存储，参数必须传 ms 整数
  const startMs = now.startOf('month').toDate().getTime()
  const endMs = now.endOf('month').toDate().getTime()

  // 无可用渠道 → 空结果
  if (channelFilter && channelFilter.length === 0) {
    return { costRanking: [], performanceRanking: [] }
  }
  const channelCond = channelFilter && channelFilter.length > 0
    ? Prisma.sql`AND channel IN (${Prisma.join(channelFilter)})`
    : Prisma.empty

  // 数据库层聚合 + ORDER BY + LIMIT，不再全量回传后内存排序
  const [costRows, perfRows] = await Promise.all([
    prisma.$queryRaw<Array<{ channel: string; cost: number }>>`
      SELECT channel, SUM(cost) AS cost
      FROM raw_data
      WHERE record_date >= ${startMs} AND record_date <= ${endMs}
      ${channelCond}
      GROUP BY channel
      ORDER BY cost DESC
      LIMIT 10
    `,
    prisma.$queryRaw<Array<{ channel: string; cost: number; roi: number; cpa: number; activations: number | bigint }>>`
      SELECT channel,
             SUM(cost) AS cost,
             CASE WHEN SUM(cost) > 0
               THEN ROUND(SUM(accounts) * ${REVENUE_PER_ACCOUNT} * 1.0 / SUM(cost), 4)
               ELSE 0
             END AS roi,
             CASE WHEN SUM(activations) > 0
               THEN ROUND(SUM(cost) * 1.0 / SUM(activations), 2)
               ELSE 0
             END AS cpa,
             SUM(activations) AS activations
      FROM raw_data
      WHERE record_date >= ${startMs} AND record_date <= ${endMs}
      ${channelCond}
      GROUP BY channel
      ORDER BY roi DESC
      LIMIT 10
    `,
  ])

  return {
    costRanking: costRows.map((r) => ({ channel: r.channel, cost: r.cost ?? 0 })),
    performanceRanking: perfRows.map((r) => ({
      channel: r.channel,
      cost: r.cost ?? 0,
      roi: r.roi ?? 0,
      cpa: r.cpa ?? 0,
      activations: Number(r.activations ?? 0), // SUM(int) 在 raw 查询中可能返回 BigInt
    })),
  }
}
