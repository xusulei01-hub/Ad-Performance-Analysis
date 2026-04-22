import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase()
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 .xlsx 和 .xls 格式文件'))
    }
  },
})

const REQUIRED_HEADERS = [
  '渠道',
  '日期',
  '计划ID',
  '曝光',
  '点击',
  '花费',
  '下载',
  '激活',
  '授信',
  '开户',
  'ROI',
]

const HEADER_MAP: Record<string, string> = {
  '渠道': 'channel',
  '日期': 'recordDate',
  '计划ID': 'campaignId',
  '品种/名称': 'campaignName',
  '曝光': 'impressions',
  '点击': 'clicks',
  '花费': 'cost',
  '下载': 'downloads',
  '激活': 'activations',
  '授信': 'credits',
  '开户': 'accounts',
  'ROI': 'roi',
}

function normalizeValue(key: string, val: unknown): string | number | Date | null {
  if (val === null || val === undefined || val === '') return null

  if (key === 'recordDate') {
    if (val instanceof Date) return val
    if (typeof val === 'number') {
      const date = XLSX.SSF.parse_date_code(val)
      if (date) return new Date(date.y, date.m - 1, date.d)
    }
    const str = String(val).trim()
    const d = dayjs(str, ['YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY-MM-DD HH:mm:ss'])
    if (d.isValid()) return d.toDate()
    return null
  }

  if (key === 'campaignName' || key === 'channel' || key === 'campaignId') {
    return String(val).trim()
  }

  const num = Number(val)
  return Number.isNaN(num) ? 0 : num
}

function validateHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
  return { valid: missing.length === 0, missing }
}

// POST /api/v1/data/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: '未上传文件' })
      return
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { header: 1 })

    if (rawData.length < 2) {
      res.status(400).json({ success: false, message: 'Excel 文件为空或没有数据行' })
      return
    }

    const headers = (rawData[0] as string[]).map((h) => String(h).trim())
    const validation = validateHeaders(headers)
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: `缺少必要列: ${validation.missing.join(', ')}`,
      })
      return
    }

    const rows = rawData.slice(1) as unknown[][]
    const records: Array<Record<string, unknown>> = []

    for (const row of rows) {
      const obj: Record<string, unknown> = {}
      for (let i = 0; i < headers.length; i++) {
        const dbKey = HEADER_MAP[headers[i]]
        if (dbKey) {
          obj[dbKey] = normalizeValue(dbKey, row[i])
        }
      }
      if (obj.channel && obj.recordDate && obj.campaignId) {
        records.push(obj)
      }
    }

    if (records.length === 0) {
      res.status(400).json({ success: false, message: '未解析到有效数据' })
      return
    }

    let insertedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    for (const rec of records) {
      const channel = String(rec.channel)
      const recordDate = rec.recordDate as Date
      const campaignId = String(rec.campaignId)

      const existing = await prisma.rawData.findUnique({
        where: {
          unique_channel_date_campaign: {
            channel,
            recordDate,
            campaignId,
          },
        },
      })

      const data = {
        channel,
        recordDate,
        campaignId,
        campaignName: rec.campaignName ? String(rec.campaignName) : null,
        impressions: Number(rec.impressions || 0),
        clicks: Number(rec.clicks || 0),
        cost: Number(rec.cost || 0),
        downloads: Number(rec.downloads || 0),
        activations: Number(rec.activations || 0),
        credits: Number(rec.credits || 0),
        accounts: Number(rec.accounts || 0),
        roi: Number(rec.roi || 0),
      }

      try {
        if (existing) {
          await prisma.rawData.update({
            where: { id: existing.id },
            data,
          })
          updatedCount++
        } else {
          await prisma.rawData.create({ data })
          insertedCount++
        }
      } catch (e) {
        errors.push(`记录 ${channel}-${campaignId}-${dayjs(recordDate).format('YYYY-MM-DD')}: ${e instanceof Error ? e.message : '未知错误'}`)
      }
    }

    const uploadLog = await prisma.uploadLog.create({
      data: {
        filename: req.file.originalname,
        recordCount: records.length,
        insertedCount,
        updatedCount,
        failedCount: errors.length,
        errorDetails: errors.length > 0 ? JSON.stringify(errors.slice(0, 50)) : null,
        uploadedBy: req.body.uploadedBy || null,
      },
    })

    res.json({
      success: true,
      data: {
        uploadId: uploadLog.id,
        filename: req.file.originalname,
        totalRecords: records.length,
        insertedCount,
        updatedCount,
        failedCount: errors.length,
        preview: records.slice(0, 5).map((r) => ({
          channel: r.channel,
          recordDate: dayjs(r.recordDate as Date).format('YYYY-MM-DD'),
          campaignId: r.campaignId,
          campaignName: r.campaignName,
          cost: r.cost,
          activations: r.activations,
          accounts: r.accounts,
          roi: r.roi,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/data/records
router.get('/records', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(500, Math.max(1, Number(req.query.page_size) || 50))
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
      if (endDate) where.recordDate.lte = new Date(endDate)
    }
    if (campaignId) {
      where.campaignId = { contains: campaignId }
    }

    const [total, records] = await Promise.all([
      prisma.rawData.count({ where }),
      prisma.rawData.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    res.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        records,
      },
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

    const channels = result.map((r) => r.channel)

    res.json({
      success: true,
      data: channels,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/data/upload-logs
router.get('/upload-logs', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(500, Math.max(1, Number(req.query.page_size) || 20))

    const [total, logs] = await Promise.all([
      prisma.uploadLog.count(),
      prisma.uploadLog.findMany({
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    res.json({
      success: true,
      data: { total, page, pageSize, logs },
    })
  } catch (err) {
    next(err)
  }
})

export default router
