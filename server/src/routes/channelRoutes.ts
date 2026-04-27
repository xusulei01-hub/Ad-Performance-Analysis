import { Router } from 'express'
import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'

const router = Router()

// GET /api/v1/channels/:channel/metrics?start_date=...&end_date=...
router.get('/:channel/metrics', async (req, res, next) => {
  try {
    const channels = req.params.channel.split(',').filter(Boolean)
    const startDate = req.query.start_date ? String(req.query.start_date) : dayjs().subtract(6, 'day').format('YYYY-MM-DD')
    const endDate = req.query.end_date ? String(req.query.end_date) : dayjs().format('YYYY-MM-DD')

    const sDate = new Date(startDate)
    const eDate = new Date(endDate)
    eDate.setHours(23, 59, 59, 999)

    const where: any = {
      recordDate: {
        gte: sDate,
        lte: eDate,
      },
    }
    if (channels.length > 0) {
      where.channel = { in: channels }
    }

    // 总指标 — 手动聚合，ROI 按业务公式计算
    const totalRows = await prisma.rawData.findMany({
      where,
      select: { cost: true, activations: true, accounts: true, formalActivations: true, leads: true, impressions: true, clicks: true, downloads: true },
    })

    let totalCost = 0
    let totalActivations = 0
    let totalAccounts = 0
    let totalFormal = 0
    let totalLeads = 0
    let totalImpressions = 0
    let totalClicks = 0
    let totalDownloads = 0

    for (const row of totalRows) {
      totalCost += row.cost
      totalActivations += row.activations
      totalAccounts += row.accounts
      totalFormal += row.formalActivations
      totalLeads += row.leads
      totalImpressions += row.impressions
      totalClicks += row.clicks
      totalDownloads += row.downloads
    }

    const totalMetrics = {
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
    }

    // 分计划指标（Top 5）
    const [costTop, activationsTop, accountsTop, roiRaw] = await Promise.all([
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
      prisma.rawData.groupBy({
        by: ['campaignId', 'campaignName'],
        where,
        _sum: { cost: true, accounts: true },
      }),
    ])

    // ROI 按计算值排序（Prisma groupBy 不支持按表达式排序）
    const roiTop = roiRaw
      .map((r) => ({
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        roi: (r._sum.cost ?? 0) > 0
          ? Number((((r._sum.accounts ?? 0) * 3100) / (r._sum.cost ?? 0)).toFixed(4))
          : 0,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5)

    const campaignMetrics = {
      cost: costTop.map((r) => ({
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        cost: r._sum.cost ?? 0,
      })),
      activations: activationsTop.map((r) => ({
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        activations: r._sum.activations ?? 0,
      })),
      accounts: accountsTop.map((r) => ({
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        accounts: r._sum.accounts ?? 0,
      })),
      roi: roiTop,
    }

    // 每日趋势
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

    const dailyTrends = dailyRaw.map((r) => ({
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

    res.json({
      success: true,
      data: {
        channels,
        dateRange: { startDate, endDate },
        totalMetrics,
        campaignMetrics,
        dailyTrends,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/channels/:channel/campaigns/:campaignId/trends?start_date=...&end_date=...
router.get('/:channel/campaigns/:campaignId/trends', async (req, res, next) => {
  try {
    const channel = req.params.channel
    const campaignId = req.params.campaignId
    const startDate = req.query.start_date ? String(req.query.start_date) : dayjs().subtract(6, 'day').format('YYYY-MM-DD')
    const endDate = req.query.end_date ? String(req.query.end_date) : dayjs().format('YYYY-MM-DD')

    const sDate = new Date(startDate)
    const eDate = new Date(endDate)
    eDate.setHours(23, 59, 59, 999)

    const rows = await prisma.rawData.findMany({
      where: {
        channel,
        campaignId,
        recordDate: { gte: sDate, lte: eDate },
      },
      orderBy: { recordDate: 'asc' },
      select: {
        recordDate: true,
        cost: true,
        activations: true,
        accounts: true,
        formalActivations: true,
        leads: true,
        impressions: true,
        clicks: true,
      },
    })

    const trends = rows.map((r) => ({
      date: dayjs(r.recordDate).format('YYYY-MM-DD'),
      cost: r.cost,
      activations: r.activations,
      accounts: r.accounts,
      formalActivations: r.formalActivations,
      leads: r.leads,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.impressions > 0 ? Number((r.clicks / r.impressions).toFixed(4)) : 0,
      roi: r.cost > 0 ? Number(((r.accounts * 3100) / r.cost).toFixed(4)) : 0,
    }))

    res.json({
      success: true,
      data: {
        channel,
        campaignId,
        dateRange: { startDate, endDate },
        trends,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
