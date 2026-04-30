import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { parsePagination } from '../../utils/pagination'

const router = Router()

// GET /api/v1/merchants/records
router.get('/records', async (req, res, next) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query)
    const qsIds = req.query.qs_id
      ? String(req.query.qs_id).split(',').filter(Boolean)
      : undefined
    const channels = req.query.channel
      ? String(req.query.channel).split(',').filter(Boolean)
      : undefined
    const startDate = req.query.start_date ? String(req.query.start_date) : undefined
    const endDate = req.query.end_date ? String(req.query.end_date) : undefined

    const where: any = {}
    if (qsIds && qsIds.length > 0) {
      where.qsId = { in: qsIds }
    }
    if (channels && channels.length > 0) {
      where.channel = { in: channels }
    }
    if (startDate || endDate) {
      where.leadDate = {}
      if (startDate) where.leadDate.gte = new Date(startDate)
      if (endDate) where.leadDate.lte = new Date(endDate + 'T23:59:59.999Z')
    }

    const [total, records] = await Promise.all([
      prisma.merchantData.count({ where }),
      prisma.merchantData.findMany({
        where,
        orderBy: { leadDate: 'desc' },
        skip,
        take: pageSize,
      }),
    ])

    const mappings = await prisma.merchantMapping.findMany()
    const mappingMap = new Map(mappings.map((m) => [m.qsId, m.merchantName]))

    const enrichedRecords = records.map((r) => ({
      ...r,
      merchantName: mappingMap.get(r.qsId) || null,
    }))

    res.json({
      success: true,
      data: { total, page, pageSize, records: enrichedRecords },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/merchants/merchants
router.get('/merchants', async (req, res, next) => {
  try {
    const result = await prisma.merchantData.groupBy({
      by: ['qsId'],
      _count: { qsId: true },
      orderBy: { qsId: 'asc' },
    })

    const mappings = await prisma.merchantMapping.findMany()
    const mappingMap = new Map(mappings.map((m) => [m.qsId, m.merchantName]))

    const list = result.map((r) => ({
      qsId: r.qsId,
      merchantName: mappingMap.get(r.qsId) || r.qsId,
      count: r._count.qsId,
    }))

    res.json({ success: true, data: list })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/merchants/channels
router.get('/channels', async (req, res, next) => {
  try {
    const result = await prisma.merchantData.groupBy({
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
