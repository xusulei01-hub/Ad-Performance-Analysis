import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { toEndOfDay } from '../../utils/date'
import { parsePagination } from '../../utils/pagination'

const router = Router()

// GET /api/v1/data/records
router.get('/records', async (req, res, next) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query)
    const channels = req.query.channel
      ? String(req.query.channel).split(',').filter(Boolean)
      : undefined
    const startDate = req.query.start_date ? String(req.query.start_date) : undefined
    const endDate = req.query.end_date ? String(req.query.end_date) : undefined
    const campaignId = req.query.campaign_id ? String(req.query.campaign_id) : undefined
    const sortBy = ['recordDate', 'channel', 'campaignId', 'cost', 'activations', 'accounts', 'roi', 'createdAt'].includes(String(req.query.sort_by))
      ? String(req.query.sort_by)
      : 'recordDate'
    const sortOrder = req.query.sort_order === 'asc' ? 'asc' : 'desc'

    const where: any = {}
    if (channels && channels.length > 0) {
      where.channel = { in: channels }
    }
    if (startDate || endDate) {
      where.recordDate = {}
      if (startDate) where.recordDate.gte = new Date(startDate)
      if (endDate) where.recordDate.lte = toEndOfDay(endDate)
    }
    if (campaignId) {
      where.campaignId = { contains: campaignId }
    }

    const [total, records] = await Promise.all([
      prisma.rawData.count({ where }),
      prisma.rawData.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
    ])

    res.json({
      success: true,
      data: { total, page, pageSize, records },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/data/channels
router.get('/channels', async (req, res, next) => {
  try {
    const result = await prisma.rawData.groupBy({
      by: ['channel'],
      _count: { channel: true },
      orderBy: { channel: 'asc' },
    })
    res.json({ success: true, data: result.map((r) => r.channel) })
  } catch (err) {
    next(err)
  }
})

export default router
