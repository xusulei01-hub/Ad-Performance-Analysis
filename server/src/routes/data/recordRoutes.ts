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
    const sortBy = ['recordDate', 'channel', 'campaignId', 'cost', 'activations', 'accounts', 'roi', 'createdAt'].includes(String(req.query.sort_by))
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

// GET /api/v1/data/channels — 返回用户有权限的渠道
router.get('/channels', async (req, res, next) => {
  try {
    const channels = resolveUserChannels(req, undefined)

    const where: any = {}
    if (channels && channels.length > 0) {
      where.channel = { in: channels }
    } else if (channels !== null && channels.length === 0) {
      return res.json({ success: true, data: [] })
    }

    const result = await prisma.rawData.groupBy({
      by: ['channel'],
      _count: { channel: true },
      orderBy: { channel: 'asc' },
      where: Object.keys(where).length > 0 ? where : undefined,
    })
    res.json({ success: true, data: result.map((r) => r.channel) })
  } catch (err) {
    next(err)
  }
})

export default router
