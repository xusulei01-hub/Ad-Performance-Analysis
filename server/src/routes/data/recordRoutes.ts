import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { toEndOfDay } from '../../utils/date'
import { parsePagination } from '../../utils/pagination'
import { resolveUserChannels } from '../../middleware/authorize'

const router = Router()

// 非管理员不可见的敏感字段
const ADMIN_ONLY_FIELDS = ['leads', 'accounts']

// GET /api/v1/data/records
router.get('/records', async (req, res, next) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query)
    let requestedChannels = req.query.channel
      ? String(req.query.channel).split(',').filter(Boolean)
      : undefined
    const startDate = req.query.start_date ? String(req.query.start_date) : undefined
    const endDate = req.query.end_date ? String(req.query.end_date) : undefined
    const campaignId = req.query.campaign_id ? String(req.query.campaign_id) : undefined
    const sortBy = [
      'recordDate', 'channel', 'campaignId', 'cost', 'impressions', 'clicks',
      'ctr', 'downloads', 'activations', 'formalActivations', 'leads',
      'accounts', 'createdAt',
    ].includes(String(req.query.sort_by))
      ? String(req.query.sort_by)
      : 'recordDate'
    const sortOrder = req.query.sort_order === 'asc' ? 'asc' : 'desc'
    const isAdmin = req.user?.role === 'admin'

    // 渠道权限过滤
    const channels = resolveUserChannels(req, requestedChannels)

    const where: any = {}
    if (channels && channels.length > 0) {
      where.channel = { in: channels }
    } else if (channels !== null && channels.length === 0 && isAdmin === false) {
      // 非 admin 且无可用渠道
      return res.json({ success: true, data: { total: 0, page, pageSize, records: [] } })
    }
    // channels === null 表示 admin 不过滤

    if (startDate || endDate) {
      where.recordDate = {}
      if (startDate) where.recordDate.gte = new Date(startDate)
      if (endDate) where.recordDate.lte = toEndOfDay(endDate)
    }
    if (campaignId) {
      where.campaignId = { contains: campaignId }
    }

    // 敏感字段过滤：非管理员不查询 leads 和 accounts
    const selectFields = isAdmin ? undefined : {
      id: true, channel: true, recordDate: true, campaignId: true, campaignName: true,
      impressions: true, clicks: true, cost: true, downloads: true, activations: true,
      formalActivations: true, ctr: true, uploadLogId: true, createdAt: true, updatedAt: true,
    }

    const [total, records] = await Promise.all([
      prisma.rawData.count({ where }),
      prisma.rawData.findMany({
        where,
        select: selectFields,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
    ])

    // 序列化时把敏感字段补 0（保证前端类型兼容）
    const sanitized = isAdmin ? records : (records as any[]).map((r) => ({
      ...r,
      leads: 0,
      accounts: 0,
    }))

    res.json({
      success: true,
      data: { total, page, pageSize, records: sanitized },
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
    const isAdmin = req.user?.role === 'admin'

    const channels = resolveUserChannels(req, requestedChannels)

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

    // 管理员查全字段，非管理员排除 leads/accounts（导出时置 0）
    const selectFields = isAdmin ? undefined : {
      id: true, channel: true, recordDate: true, campaignId: true, campaignName: true,
      impressions: true, clicks: true, cost: true, downloads: true, activations: true,
      formalActivations: true, ctr: true,
    }

    const records = await prisma.rawData.findMany({
      where,
      select: selectFields,
      orderBy: [{ channel: 'asc' }, { recordDate: 'asc' }, { campaignId: 'asc' }],
    })

    const REVENUE_PER_ACCOUNT = 3100
    const rows = records.map((r: any) => {
      const accounts = isAdmin ? (r.accounts ?? 0) : 0
      const leads = isAdmin ? (r.leads ?? 0) : 0
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
        leads,
        accounts,
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
