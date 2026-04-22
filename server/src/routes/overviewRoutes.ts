import { Router } from 'express'
import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'

const router = Router()

/**
 * 按花费加权计算 ROI
 * 整体 ROI = SUM(cost * roi) / SUM(cost)
 * 这样花费多的计划对整体 ROI 影响更大，避免简单算术平均失真
 */
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

  const rows = await prisma.rawData.findMany({
    where,
    select: { cost: true, activations: true, accounts: true, roi: true },
  })

  let totalCost = 0
  let totalActivations = 0
  let totalAccounts = 0
  let weightedRoiSum = 0

  for (const row of rows) {
    totalCost += row.cost
    totalActivations += row.activations
    totalAccounts += row.accounts
    weightedRoiSum += row.cost * row.roi
  }

  return {
    cost: totalCost,
    activations: totalActivations,
    accounts: totalAccounts,
    roi: totalCost > 0 ? Number((weightedRoiSum / totalCost).toFixed(4)) : 0,
  }
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
    const { startOfWeek, endOfWeek } = getWeekRange(now)

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
        targetCost: 1000000,
        targetActivations: 8000,
        targetAccounts: 5000,
        targetRoi: 1.5,
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
        targetRoi: 1.5,
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

    // 一次性查出本月所有原始数据，手动分组聚合，避免 _avg(roi) 的简单平均失真
    const rows = await prisma.rawData.findMany({
      where: {
        recordDate: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { channel: true, cost: true, activations: true, roi: true },
    })

    const channelMap = new Map<string, { cost: number; activations: number; roiWeightedSum: number }>()

    for (const row of rows) {
      const existing = channelMap.get(row.channel)
      if (existing) {
        existing.cost += row.cost
        existing.activations += row.activations
        existing.roiWeightedSum += row.cost * row.roi
      } else {
        channelMap.set(row.channel, {
          cost: row.cost,
          activations: row.activations,
          roiWeightedSum: row.cost * row.roi,
        })
      }
    }

    const channelData = Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel,
      cost: data.cost,
      roi: data.cost > 0 ? Number((data.roiWeightedSum / data.cost).toFixed(4)) : 0,
      cpa: data.activations > 0 ? Number((data.cost / data.activations).toFixed(2)) : 0,
      activations: data.activations,
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
