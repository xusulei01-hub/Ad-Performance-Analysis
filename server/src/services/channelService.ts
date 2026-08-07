import dayjs from 'dayjs'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { calcRoi, calcCtr, calcCpa } from '../utils/formulas'
import { toEndOfDay } from '../utils/date'
import { maskMetric, shouldMaskSensitiveMetrics } from '../utils/sensitiveMask'
import { REVENUE_PER_ACCOUNT } from '../constants'
import type { DailyTrendItem } from '../types'

/**
 * ROI Top N 计划（数据库层计算 + LIMIT）
 * 注意：SQLite 中 record_date 以毫秒时间戳存储，参数必须传 ms 整数
 */
async function queryRoiTopCampaigns(sDate: Date, eDate: Date, channels: string[], take = 5) {
  const channelCond = channels.length > 0
    ? Prisma.sql`AND channel IN (${Prisma.join(channels)})`
    : Prisma.empty
  const rows = await prisma.$queryRaw<Array<{ campaignId: string; campaignName: string | null; roi: number }>>`
    SELECT campaign_id AS campaignId,
           campaign_name AS campaignName,
           CASE WHEN SUM(cost) > 0
             THEN ROUND(SUM(accounts) * ${REVENUE_PER_ACCOUNT} * 1.0 / SUM(cost), 4)
             ELSE 0
           END AS roi
    FROM raw_data
    WHERE record_date >= ${sDate.getTime()} AND record_date <= ${eDate.getTime()}
    ${channelCond}
    GROUP BY campaign_id, campaign_name
    ORDER BY roi DESC
    LIMIT ${take}
  `
  return rows
}

export async function getChannelMetrics(channels: string[], startDate: string, endDate: string, isNonAdmin = false) {
  const shouldMask = shouldMaskSensitiveMetrics(isNonAdmin)
  const sDate = new Date(startDate)
  const eDate = toEndOfDay(endDate)

  const where: any = {
    recordDate: { gte: sDate, lte: eDate },
  }
  if (channels.length > 0) {
    where.channel = { in: channels }
  }

  // 始终查询完整转化字段；渠道权限仍由上层过滤。
  const sumFields = {
    cost: true, activations: true, accounts: true, formalActivations: true,
    leads: true, impressions: true, clicks: true, downloads: true,
  } as const

  const totalAgg = await prisma.rawData.aggregate({ where, _sum: sumFields })

  const totalCost = totalAgg._sum.cost ?? 0
  const realAccounts = totalAgg._sum.accounts ?? 0
  const totalImpressions = totalAgg._sum.impressions ?? 0
  const totalClicks = totalAgg._sum.clicks ?? 0

  const totalMetrics = {
    cost: totalCost,
    activations: totalAgg._sum.activations ?? 0,
    accounts: maskMetric(realAccounts, shouldMask),
    formalActivations: totalAgg._sum.formalActivations ?? 0,
    leads: maskMetric(totalAgg._sum.leads ?? 0, shouldMask),
    impressions: totalImpressions,
    clicks: totalClicks,
    downloads: totalAgg._sum.downloads ?? 0,
    ctr: calcCtr(totalClicks, totalImpressions),
    roi: calcRoi(realAccounts, totalCost), // ROI 用真实 accounts 计算
  }

  const [costTop, activationsTop, accountsTop, roiTop] = await Promise.all([
    prisma.rawData.groupBy({
      by: ['campaignId', 'campaignName'],
      where,
      _sum: { cost: true },
      orderBy: { _sum: { cost: 'desc' } },
      take: 5,
    }),
    prisma.rawData.groupBy({
      by: ['campaignId', 'campaignName'],
      where,
      _sum: { activations: true },
      orderBy: { _sum: { activations: 'desc' } },
      take: 5,
    }),
    prisma.rawData.groupBy({
      by: ['campaignId', 'campaignName'],
      where,
      _sum: { accounts: true },
      orderBy: { _sum: { accounts: 'desc' } },
      take: 5,
    }),
    queryRoiTopCampaigns(sDate, eDate, channels, 5),
  ])

  const campaignMetrics = {
    cost: costTop.map((r) => ({ campaignId: r.campaignId, campaignName: r.campaignName, cost: r._sum.cost ?? 0 })),
    activations: activationsTop.map((r) => ({ campaignId: r.campaignId, campaignName: r.campaignName, activations: r._sum.activations ?? 0 })),
    accounts: accountsTop.map((r) => ({ campaignId: r.campaignId, campaignName: r.campaignName, accounts: maskMetric(r._sum.accounts ?? 0, shouldMask) })),
    roi: roiTop,
  }

  const dailyRaw = await prisma.rawData.groupBy({
    by: ['recordDate'],
    where,
    _sum: sumFields,
    orderBy: { recordDate: 'asc' },
  })

  const dailyTrends: DailyTrendItem[] = dailyRaw.map((r) => {
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

  const channelBreakdownRaw = await prisma.rawData.groupBy({
    by: ['channel'],
    where,
    _sum: sumFields,
  })

  const channelBreakdown = channelBreakdownRaw.map((r) => {
    const c = r._sum.cost ?? 0
    const a = r._sum.activations ?? 0
    const realAcc = r._sum.accounts ?? 0
    const imp = r._sum.impressions ?? 0
    const clk = r._sum.clicks ?? 0
    return {
      channel: r.channel,
      cost: c,
      activations: a,
      accounts: maskMetric(realAcc, shouldMask),
      formalActivations: r._sum.formalActivations ?? 0,
      leads: maskMetric(r._sum.leads ?? 0, shouldMask),
      impressions: imp,
      clicks: clk,
      downloads: r._sum.downloads ?? 0,
      ctr: calcCtr(clk, imp),
      roi: calcRoi(realAcc, c),
      cpa: calcCpa(c, a),
    }
  })

  return { channels, dateRange: { startDate, endDate }, totalMetrics, campaignMetrics, dailyTrends, channelBreakdown }
}

export async function getCampaignTrends(channel: string, campaignId: string, startDate: string, endDate: string, isNonAdmin = false) {
  const shouldMask = shouldMaskSensitiveMetrics(isNonAdmin)
  const sDate = new Date(startDate)
  const eDate = toEndOfDay(endDate)

  const rows = await prisma.rawData.findMany({
    where: {
      channel,
      campaignId,
      recordDate: { gte: sDate, lte: eDate },
    },
    orderBy: { recordDate: 'asc' },
    select: {
      recordDate: true, cost: true, activations: true, accounts: true,
      formalActivations: true, leads: true, impressions: true, clicks: true,
    },
  })

  const trends = rows.map((r: any) => {
    const realAcc = r.accounts ?? 0
    return {
      date: dayjs(r.recordDate).format('YYYY-MM-DD'),
      cost: r.cost,
      activations: r.activations,
      accounts: maskMetric(realAcc, shouldMask),
      formalActivations: r.formalActivations ?? 0,
      leads: maskMetric(r.leads ?? 0, shouldMask),
      impressions: r.impressions ?? 0,
      clicks: r.clicks ?? 0,
      ctr: calcCtr(r.clicks ?? 0, r.impressions ?? 0),
      roi: calcRoi(realAcc, r.cost ?? 0),
    }
  })

  return { channel, campaignId, dateRange: { startDate, endDate }, trends }
}
