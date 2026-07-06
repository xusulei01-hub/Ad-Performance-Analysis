import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'
import { calcRoi, calcCtr, calcCpa } from '../utils/formulas'
import { toEndOfDay } from '../utils/date'
import type { DailyTrendItem } from '../types'

export async function getChannelMetrics(channels: string[], startDate: string, endDate: string, isNonAdmin = false) {
  const sDate = new Date(startDate)
  const eDate = toEndOfDay(endDate)

  const where: any = {
    recordDate: { gte: sDate, lte: eDate },
  }
  if (channels.length > 0) {
    where.channel = { in: channels }
  }

  const sumFields: any = isNonAdmin
    ? { cost: true, activations: true, formalActivations: true, impressions: true, clicks: true, downloads: true }
    : { cost: true, activations: true, accounts: true, formalActivations: true, leads: true, impressions: true, clicks: true, downloads: true }

  const totalAgg = await prisma.rawData.aggregate({ where, _sum: sumFields })

  const totalCost = totalAgg._sum.cost ?? 0
  const totalAccounts = isNonAdmin ? 0 : (totalAgg._sum.accounts ?? 0)
  const totalImpressions = totalAgg._sum.impressions ?? 0
  const totalClicks = totalAgg._sum.clicks ?? 0

  const totalMetrics = {
    cost: totalCost,
    activations: totalAgg._sum.activations ?? 0,
    accounts: totalAccounts,
    formalActivations: totalAgg._sum.formalActivations ?? 0,
    leads: isNonAdmin ? 0 : (totalAgg._sum.leads ?? 0),
    impressions: totalImpressions,
    clicks: totalClicks,
    downloads: totalAgg._sum.downloads ?? 0,
    ctr: calcCtr(totalClicks, totalImpressions),
    roi: calcRoi(totalAccounts, totalCost),
  }

  const [costTop, activationsTop, accountsTop] = await Promise.all([
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
      _sum: { cost: true, accounts: isNonAdmin ? undefined : true },
    }),
  ])

  const roiTop = accountsTop
    .map((r) => ({
      campaignId: r.campaignId,
      campaignName: r.campaignName,
      roi: calcRoi(isNonAdmin ? 0 : (r._sum.accounts ?? 0), r._sum.cost ?? 0),
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5)

  const campaignMetrics = {
    cost: costTop.map((r) => ({ campaignId: r.campaignId, campaignName: r.campaignName, cost: r._sum.cost ?? 0 })),
    activations: activationsTop.map((r) => ({ campaignId: r.campaignId, campaignName: r.campaignName, activations: r._sum.activations ?? 0 })),
    accounts: isNonAdmin
      ? []
      : accountsTop.map((r) => ({ campaignId: r.campaignId, campaignName: r.campaignName, accounts: (r._sum as any).accounts ?? 0 })),
    roi: roiTop,
  }

  const dailyRaw = await prisma.rawData.groupBy({
    by: ['recordDate'],
    where,
    _sum: sumFields,
    orderBy: { recordDate: 'asc' },
  })

  const dailyTrends: DailyTrendItem[] = dailyRaw.map((r) => ({
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

  const channelBreakdownRaw = await prisma.rawData.groupBy({
    by: ['channel'],
    where,
    _sum: sumFields,
  })

  const channelBreakdown = channelBreakdownRaw.map((r) => {
    const c = r._sum.cost ?? 0
    const a = r._sum.activations ?? 0
    const acc = isNonAdmin ? 0 : (r._sum.accounts ?? 0)
    const imp = r._sum.impressions ?? 0
    const clk = r._sum.clicks ?? 0
    return {
      channel: r.channel,
      cost: c,
      activations: a,
      accounts: acc,
      formalActivations: r._sum.formalActivations ?? 0,
      leads: isNonAdmin ? 0 : (r._sum.leads ?? 0),
      impressions: imp,
      clicks: clk,
      downloads: r._sum.downloads ?? 0,
      ctr: calcCtr(clk, imp),
      roi: calcRoi(acc, c),
      cpa: calcCpa(c, a),
    }
  })

  return { channels, dateRange: { startDate, endDate }, totalMetrics, campaignMetrics, dailyTrends, channelBreakdown }
}

export async function getCampaignTrends(channel: string, campaignId: string, startDate: string, endDate: string, isNonAdmin = false) {
  const sDate = new Date(startDate)
  const eDate = toEndOfDay(endDate)

  const rows = await prisma.rawData.findMany({
    where: {
      channel,
      campaignId,
      recordDate: { gte: sDate, lte: eDate },
    },
    orderBy: { recordDate: 'asc' },
    select: isNonAdmin
      ? { recordDate: true, cost: true, activations: true, formalActivations: true, impressions: true, clicks: true }
      : { recordDate: true, cost: true, activations: true, accounts: true, formalActivations: true, leads: true, impressions: true, clicks: true },
  })

  const trends = rows.map((r: any) => ({
    date: dayjs(r.recordDate).format('YYYY-MM-DD'),
    cost: r.cost,
    activations: r.activations,
    accounts: isNonAdmin ? 0 : (r.accounts ?? 0),
    formalActivations: r.formalActivations ?? 0,
    leads: isNonAdmin ? 0 : (r.leads ?? 0),
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    ctr: calcCtr(r.clicks ?? 0, r.impressions ?? 0),
    roi: calcRoi(isNonAdmin ? 0 : (r.accounts ?? 0), r.cost ?? 0),
  }))

  return { channel, campaignId, dateRange: { startDate, endDate }, trends }
}
