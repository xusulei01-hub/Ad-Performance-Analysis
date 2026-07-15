import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { toEndOfDay } from '../../utils/date'
import { parsePagination } from '../../utils/pagination'
import { resolveUserChannels } from '../../middleware/authorize'
import { calcCpa, calcCtr, calcRoi } from '../../utils/formulas'
import { maskMetric, shouldMaskSensitiveMetrics } from '../../utils/sensitiveMask'

const router = Router()

function buildRawDataWhere(req: any, requestedChannels?: string[], isAdmin = false) {
  const channels = resolveUserChannels(req, requestedChannels)
  const where: any = {}

  if (channels && channels.length > 0) {
    where.channel = { in: channels }
  } else if (channels !== null && channels.length === 0 && isAdmin === false) {
    return { where, empty: true }
  }

  const startDate = req.query.start_date ? String(req.query.start_date) : undefined
  const endDate = req.query.end_date ? String(req.query.end_date) : undefined
  const campaignId = req.query.campaign_id ? String(req.query.campaign_id) : undefined

  if (startDate || endDate) {
    where.recordDate = {}
    if (startDate) where.recordDate.gte = new Date(startDate)
    if (endDate) where.recordDate.lte = toEndOfDay(endDate)
  }
  if (campaignId) {
    where.campaignId = { contains: campaignId }
  }

  return { where, empty: false }
}

function calcNullableChange(current: number, previous?: number | null) {
  const previousValue = previous ?? 0
  if (previousValue === 0) return current === 0 ? 0 : null
  return Number(((current - previousValue) / previousValue).toFixed(4))
}

function getCampaignKey(row: { channel: string; campaignId: string }) {
  return `${row.channel}::${row.campaignId}`
}

function buildCampaignNameMap(rows: Array<{ channel: string; campaignId: string; campaignName: string | null }>) {
  const nameMap = new Map<string, string | null>()
  for (const row of rows) {
    const key = getCampaignKey(row)
    const name = row.campaignName?.trim()
    if (name && !nameMap.has(key)) {
      nameMap.set(key, name)
    }
  }
  return nameMap
}

// GET /api/v1/data/records
router.get('/records', async (req, res, next) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query)
    let requestedChannels = req.query.channel
      ? String(req.query.channel).split(',').filter(Boolean)
      : undefined
    const sortBy = [
      'recordDate', 'channel', 'campaignId', 'cost', 'impressions', 'clicks',
      'ctr', 'downloads', 'activations', 'formalActivations', 'leads',
      'accounts', 'createdAt',
    ].includes(String(req.query.sort_by))
      ? String(req.query.sort_by)
      : 'recordDate'
    const sortOrder = req.query.sort_order === 'asc' ? 'asc' : 'desc'
    const isAdmin = req.user?.role === 'admin'
    const shouldMask = shouldMaskSensitiveMetrics(!isAdmin)

    // 渠道权限过滤
    const { where, empty } = buildRawDataWhere(req, requestedChannels, isAdmin)
    if (empty) {
      // 非 admin 且无可用渠道
      return res.json({ success: true, data: { total: 0, page, pageSize, records: [] } })
    }
    // channels === null 表示 admin 不过滤

    const [total, records] = await Promise.all([
      prisma.rawData.count({ where }),
      prisma.rawData.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
    ])
    const responseRecords = shouldMask
      ? records.map((r) => ({ ...r, leads: '**', accounts: '**' }))
      : records

    res.json({
      success: true,
      data: { total, page, pageSize, records: responseRecords },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/data/campaign-summary — 按渠道 + 计划 ID 汇总筛选周期内投放效果
router.get('/campaign-summary', async (req, res, next) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query)
    const requestedChannels = req.query.channel
      ? String(req.query.channel).split(',').filter(Boolean)
      : undefined
    const sortBy = [
      'channel', 'campaignId', 'campaignName', 'cost', 'impressions', 'clicks',
      'ctr', 'downloads', 'activations', 'cpa', 'formalActivations',
      'leads', 'accounts', 'activationAccountRate', 'roi',
    ].includes(String(req.query.sort_by))
      ? String(req.query.sort_by)
      : 'cost'
    const sortOrder = req.query.sort_order === 'asc' ? 'asc' : 'desc'
    const isAdmin = req.user?.role === 'admin'
    const shouldMask = shouldMaskSensitiveMetrics(!isAdmin)
    const { where, empty } = buildRawDataWhere(req, requestedChannels, isAdmin)
    if (empty) {
      return res.json({ success: true, data: { total: 0, page, pageSize, records: [] } })
    }

    const [groups, nameRows] = await Promise.all([
      prisma.rawData.groupBy({
        by: ['channel', 'campaignId'],
        where,
        _sum: {
          cost: true,
          impressions: true,
          clicks: true,
          downloads: true,
          activations: true,
          formalActivations: true,
          leads: true,
          accounts: true,
        },
      }),
      prisma.rawData.findMany({
        where: { ...where, campaignName: { not: null } },
        select: { channel: true, campaignId: true, campaignName: true },
        orderBy: { recordDate: 'desc' },
      }),
    ])
    const campaignNameMap = buildCampaignNameMap(nameRows)

    const previousStartDate = req.query.previous_start_date ? String(req.query.previous_start_date) : undefined
    const previousEndDate = req.query.previous_end_date ? String(req.query.previous_end_date) : undefined
    let previousCostMap = new Map<string, number>()

    if (previousStartDate || previousEndDate) {
      const previousWhere: any = { ...where }
      delete previousWhere.recordDate
      previousWhere.recordDate = {}
      if (previousStartDate) previousWhere.recordDate.gte = new Date(previousStartDate)
      if (previousEndDate) previousWhere.recordDate.lte = toEndOfDay(previousEndDate)

      const previousGroups = await prisma.rawData.groupBy({
        by: ['channel', 'campaignId'],
        where: previousWhere,
        _sum: { cost: true },
      })
      previousCostMap = new Map(previousGroups.map((g) => [getCampaignKey(g), g._sum.cost ?? 0]))
    }

    const records = groups.map((g) => {
      const cost = g._sum.cost ?? 0
      const impressions = g._sum.impressions ?? 0
      const clicks = g._sum.clicks ?? 0
      const activations = g._sum.activations ?? 0
      const realAccounts = g._sum.accounts ?? 0
      const activationAccountRate = activations > 0 ? Number((realAccounts / activations).toFixed(4)) : 0
      return {
        channel: g.channel,
        campaignId: g.campaignId,
        campaignName: campaignNameMap.get(getCampaignKey(g)) ?? null,
        impressions,
        clicks,
        cost,
        downloads: g._sum.downloads ?? 0,
        activations,
        formalActivations: g._sum.formalActivations ?? 0,
        leads: g._sum.leads ?? 0,
        accounts: realAccounts,
        activationAccountRate,
        ctr: calcCtr(clicks, impressions),
        cpa: calcCpa(cost, activations),
        roi: calcRoi(realAccounts, cost),
        costChange: calcNullableChange(cost, previousCostMap.get(getCampaignKey(g))),
      }
    })

    records.sort((a: any, b: any) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      if (typeof aValue === 'string' || typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? String(aValue ?? '').localeCompare(String(bValue ?? ''))
          : String(bValue ?? '').localeCompare(String(aValue ?? ''))
      }
      return sortOrder === 'asc'
        ? Number(aValue ?? 0) - Number(bValue ?? 0)
        : Number(bValue ?? 0) - Number(aValue ?? 0)
    })

    res.json({
      success: true,
      data: {
        total: records.length,
        page,
        pageSize,
        records: records.slice(skip, skip + pageSize).map((r) => ({
          ...r,
          leads: maskMetric(r.leads, shouldMask),
          accounts: maskMetric(r.accounts, shouldMask),
          activationAccountRate: maskMetric(r.activationAccountRate, shouldMask),
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/data/channels — 返回用户有权限的渠道（优先从 conv_data 获取，fallback raw_data）
router.get('/channels', async (req, res, next) => {
  try {
    const channels = resolveUserChannels(req, undefined)

    const where: any = {}
    if (channels && channels.length > 0) {
      where.channel = { in: channels }
    } else if (channels !== null && channels.length === 0) {
      return res.json({ success: true, data: [] })
    }
    const whereClause = Object.keys(where).length > 0 ? where : undefined

    // 优先从 conv_data 查渠道（转化表渠道更全），再从 raw_data 合并
    const [convChannels, rawChannels] = await Promise.all([
      prisma.convData.groupBy({
        by: ['channel'],
        _count: { channel: true },
        orderBy: { channel: 'asc' },
        where: whereClause,
      }),
      prisma.rawData.groupBy({
        by: ['channel'],
        _count: { channel: true },
        orderBy: { channel: 'asc' },
        where: whereClause,
      }),
    ])

    // 合并去重
    const allChannels = [...new Set([
      ...convChannels.map((r) => r.channel),
      ...rawChannels.map((r) => r.channel),
    ])].sort()

    res.json({ success: true, data: allChannels })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/data/records/export — 导出筛选后的明细（含 ROI）
// 返回 CSV：渠道、日期、计划ID、品种/名称、曝光、点击、CTR、花费、下载、激活、转正、留资、开户、ROI
router.get('/records/export', async (req, res, next) => {
  try {
    const requestedChannels = req.query.channel
      ? String(req.query.channel).split(',').filter(Boolean)
      : undefined
    const startDate = req.query.start_date ? String(req.query.start_date) : undefined
    const endDate = req.query.end_date ? String(req.query.end_date) : undefined
    const campaignId = req.query.campaign_id ? String(req.query.campaign_id) : undefined
    const channels = resolveUserChannels(req, requestedChannels)
    const shouldMask = shouldMaskSensitiveMetrics(req.user?.role !== 'admin')

    const where: any = {}
    if (channels && channels.length > 0) {
      where.channel = { in: channels }
    } else if (channels !== null && channels.length === 0) {
      // 无可用渠道 → 返回空 CSV（仅表头）
      const headers = ['渠道', '日期', '计划ID', '品种/名称', '曝光', '点击', 'CTR', '花费', '下载', '激活', '转正', '留资', '开户', 'ROI']
      const csv = '﻿' + headers.join(',') + '\n'
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="records.csv"')
      res.send(csv)
      return
    }

    if (startDate || endDate) {
      where.recordDate = {}
      if (startDate) where.recordDate.gte = new Date(startDate)
      if (endDate) where.recordDate.lte = toEndOfDay(endDate)
    }
    if (campaignId) {
      where.campaignId = { contains: campaignId }
    }

    const records = await prisma.rawData.findMany({
      where,
      orderBy: [{ channel: 'asc' }, { recordDate: 'asc' }, { campaignId: 'asc' }],
    })

    const REVENUE_PER_ACCOUNT = 3100
    const rows = records.map((r: any) => {
      const accounts = r.accounts ?? 0
      const leads = r.leads ?? 0
      const cost = r.cost ?? 0
      const roi = cost > 0 ? Number(((accounts * REVENUE_PER_ACCOUNT) / cost).toFixed(4)) : 0
      const ctr = r.ctr ?? 0
      const date = new Date(r.recordDate).toISOString().slice(0, 10)
      const name = (r.campaignName || '').replace(/"/g, '""')
      return [
        r.channel,
        date,
        r.campaignId,
        `"${name}"`,
        r.impressions ?? 0,
        r.clicks ?? 0,
        (ctr * 100).toFixed(2) + '%',
        cost.toFixed(2),
        r.downloads ?? 0,
        r.activations ?? 0,
        r.formalActivations ?? 0,
        shouldMask ? '"**"' : leads,
        shouldMask ? '"**"' : accounts,
        roi.toFixed(4),
      ].join(',')
    })

    const headers = ['渠道', '日期', '计划ID', '品种/名称', '曝光', '点击', 'CTR', '花费', '下载', '激活', '转正', '留资', '开户', 'ROI']
    const csv = '﻿' + headers.join(',') + '\n' + rows.join('\n') + '\n'

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="records.csv"')
    res.send(csv)
  } catch (err) {
    next(err)
  }
})

export default router
