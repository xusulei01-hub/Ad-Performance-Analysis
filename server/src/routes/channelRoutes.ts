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

    // 总指标 — 手动聚合，ROI 按花费加权
    const totalRows = await prisma.rawData.findMany({
      where,
      select: { cost: true, activations: true, accounts: true, roi: true },
    })

    let totalCost = 0
    let totalActivations = 0
    let totalAccounts = 0
    let weightedRoiSum = 0

    for (const row of totalRows) {
      totalCost += row.cost
      totalActivations += row.activations
      totalAccounts += row.accounts
      weightedRoiSum += row.cost * row.roi
    }

    const totalMetrics = {
      cost: totalCost,
      activations: totalActivations,
      accounts: totalAccounts,
      roi: totalCost > 0 ? Number((weightedRoiSum / totalCost).toFixed(4)) : 0,
    }

    // 分计划指标（Top 5）
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
      prisma.rawData.groupBy({
        by: ['campaignId', 'campaignName'],
        where,
        _avg: { roi: true },
        orderBy: { _avg: { roi: 'desc' } },
        take: 5,
      }),
    ])

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
      roi: roiTop.map((r) => ({
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        roi: r._avg.roi ?? 0,
      })),
    }

    // 每日趋势
    const dailyRaw = await prisma.rawData.groupBy({
      by: ['recordDate'],
      where,
      _sum: {
        cost: true,
        activations: true,
        accounts: true,
      },
      _avg: {
        roi: true,
      },
      orderBy: { recordDate: 'asc' },
    })

    const dailyTrends = dailyRaw.map((r) => ({
      date: dayjs(r.recordDate).format('YYYY-MM-DD'),
      cost: r._sum.cost ?? 0,
      activations: r._sum.activations ?? 0,
      accounts: r._sum.accounts ?? 0,
      roi: r._avg.roi ?? 0,
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

export default router
