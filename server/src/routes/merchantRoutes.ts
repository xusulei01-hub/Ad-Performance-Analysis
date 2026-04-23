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
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 .xlsx / .xls / .csv 格式文件'))
    }
  },
})

/* ─────────── 文件解析 ─────────── */

function parseBuffer(buffer: Buffer, filename: string): unknown[][] {
  const ext = filename.toLowerCase()

  if (ext.endsWith('.csv')) {
    const text = buffer.toString('utf-8')
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    return lines.map((line) => {
      const result: string[] = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') {
            cur += '"'
            i++
          } else {
            inQuote = !inQuote
          }
        } else if (ch === ',' && !inQuote) {
          result.push(cur.trim())
          cur = ''
        } else {
          cur += ch
        }
      }
      result.push(cur.trim())
      return result.map((v) => v.replace(/^"|"$/g, ''))
    })
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
}

/* ─────────── 日期统一 ─────────── */

function normalizeDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).trim()

  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(str)) {
    return str.replace(/\//g, '-')
  }

  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  }

  const num = Number(str)
  if (!Number.isNaN(num) && num > 30000 && num < 60000) {
    const d = XLSX.SSF.parse_date_code(num)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }

  const d = dayjs(str, ['YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY-MM-DD HH:mm:ss'])
  if (d.isValid()) return d.format('YYYY-MM-DD')

  return null
}

/* ─────────── 表头映射 ─────────── */

const MERCHANT_HEADERS: Record<string, string> = {
  'user_id': 'userId',
  '用户id': 'userId',
  'qs_id': 'qsId',
  '期商id': 'qsId',
  '期商ID': 'qsId',
  '渠道': 'channel',
  '付费渠道': 'channel',
  '留资日期': 'leadDate',
  '开户日期': 'accountDate',
}

function parseRows(rows: unknown[][], headerMap: Record<string, string>): Array<Record<string, unknown>> {
  if (rows.length < 2) return []
  const headers = (rows[0] as string[]).map((h) => String(h).trim())

  const fuzzyHeaderMap = new Map<string, string>()
  for (const [key, val] of Object.entries(headerMap)) {
    fuzzyHeaderMap.set(key, val)
    fuzzyHeaderMap.set(key.toLowerCase(), val)
    fuzzyHeaderMap.set(key.replace(/\s+/g, ''), val)
    fuzzyHeaderMap.set(key.toLowerCase().replace(/\s+/g, ''), val)
  }

  const out: Array<Record<string, unknown>> = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as string[]
    const obj: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j]
      const dbKey = fuzzyHeaderMap.get(h) || fuzzyHeaderMap.get(h.toLowerCase()) || fuzzyHeaderMap.get(h.replace(/\s+/g, '')) || fuzzyHeaderMap.get(h.toLowerCase().replace(/\s+/g, ''))
      if (dbKey) obj[dbKey] = row[j]
    }
    out.push(obj)
  }
  return out
}

/* ─────────── 上传 ─────────── */

interface ParsedMerchantRow {
  userId: string
  qsId: string
  channel: string
  leadDate: string
  accountDate: string | null
}

// POST /api/v1/merchants/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ success: false, message: '需要上传文件' })
      return
    }

    const raw = parseBuffer(file.buffer, file.originalname)
    if (raw.length < 2) {
      res.status(400).json({ success: false, message: '上传文件为空或没有数据行' })
      return
    }

    const parsed = parseRows(raw, MERCHANT_HEADERS)
      .map((r): ParsedMerchantRow | null => {
        const leadDate = normalizeDate(r.leadDate)
        if (!leadDate) return null
        const userId = String(r.userId || '').trim()
        const qsId = String(r.qsId || '').trim()
        const channel = String(r.channel || '').trim()
        if (!userId || !qsId || !channel) return null

        const accountDate = normalizeDate(r.accountDate)
        return {
          userId,
          qsId,
          channel,
          leadDate,
          accountDate,
        }
      })
      .filter((r): r is ParsedMerchantRow => r !== null)

    if (parsed.length === 0) {
      res.status(400).json({ success: false, message: '未能解析到任何有效数据，请检查表头和格式' })
      return
    }

    // 1. 先查出所有已有的 userId，建立映射
    const existingRows = await prisma.merchantData.findMany({
      where: { userId: { in: parsed.map((r) => r.userId) } },
      select: { id: true, userId: true },
    })
    const existingMap = new Map(existingRows.map((r) => [r.userId, r.id]))

    const toInsert: any[] = []
    const toUpdate: { id: number; data: any }[] = []

    for (const row of parsed) {
      const data = {
        userId: row.userId,
        qsId: row.qsId,
        channel: row.channel,
        leadDate: new Date(row.leadDate),
        accountDate: row.accountDate ? new Date(row.accountDate) : null,
      }
      const existingId = existingMap.get(row.userId)
      if (existingId) {
        toUpdate.push({ id: existingId, data })
      } else {
        toInsert.push(data)
      }
    }

    // 2. 批量插入新记录
    const BATCH_SIZE = 200
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      await prisma.merchantData.createMany({ data: batch })
    }

    // 3. 逐条更新已有记录（不用事务包裹，避免超时）
    for (const { id, data } of toUpdate) {
      await prisma.merchantData.update({ where: { id }, data })
    }

    const insertedCount = toInsert.length
    const updatedCount = toUpdate.length

    res.json({
      success: true,
      data: {
        filename: file.originalname,
        totalRecords: parsed.length,
        insertedCount,
        updatedCount,
      },
    })
  } catch (err) {
    next(err)
  }
})

/* ─────────── 数据查询 ─────────── */

// GET /api/v1/merchants/records
router.get('/records', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(500, Math.max(1, Number(req.query.page_size) || 50))
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    //  enrich with merchant name from mapping
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

/* ─────────── 报表 ─────────── */

// GET /api/v1/merchants/reports/merchant?start_date=...&end_date=...
router.get('/reports/merchant', async (req, res, next) => {
  try {
    const startDate = req.query.start_date ? String(req.query.start_date) : dayjs().startOf('month').format('YYYY-MM-DD')
    const endDate = req.query.end_date ? String(req.query.end_date) : dayjs().format('YYYY-MM-DD')

    const where = {
      leadDate: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    }

    const rows = await prisma.merchantData.findMany({ where })
    const mappings = await prisma.merchantMapping.findMany()
    const mappingMap = new Map(mappings.map((m) => [m.qsId, m.merchantName]))

    const merchantMap = new Map<string, { leads: number; accounts: number; merchantName: string }>()

    for (const row of rows) {
      const existing = merchantMap.get(row.qsId)
      if (existing) {
        existing.leads++
        if (row.accountDate) existing.accounts++
      } else {
        merchantMap.set(row.qsId, {
          leads: 1,
          accounts: row.accountDate ? 1 : 0,
          merchantName: mappingMap.get(row.qsId) || row.qsId,
        })
      }
    }

    const report = Array.from(merchantMap.entries()).map(([qsId, data]) => {
      const cost = data.leads * 1000
      return {
        qsId,
        merchantName: data.merchantName,
        leads: data.leads,
        accounts: data.accounts,
        cost,
        accountRate: data.leads > 0 ? Number((data.accounts / data.leads).toFixed(4)) : 0,
        accountCost: data.accounts > 0 ? Number((cost / data.accounts).toFixed(2)) : 0,
      }
    }).sort((a, b) => b.cost - a.cost)

    res.json({ success: true, data: { dateRange: { startDate, endDate }, report } })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/merchants/reports/channel?start_date=...&end_date=...
router.get('/reports/channel', async (req, res, next) => {
  try {
    const startDate = req.query.start_date ? String(req.query.start_date) : dayjs().startOf('month').format('YYYY-MM-DD')
    const endDate = req.query.end_date ? String(req.query.end_date) : dayjs().format('YYYY-MM-DD')

    const where = {
      leadDate: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    }

    const rows = await prisma.merchantData.findMany({ where })

    const channelMap = new Map<string, { leads: number; accounts: number }>()

    for (const row of rows) {
      const existing = channelMap.get(row.channel)
      if (existing) {
        existing.leads++
        if (row.accountDate) existing.accounts++
      } else {
        channelMap.set(row.channel, {
          leads: 1,
          accounts: row.accountDate ? 1 : 0,
        })
      }
    }

    const report = Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel,
      leads: data.leads,
      accounts: data.accounts,
      accountRate: data.leads > 0 ? Number((data.accounts / data.leads).toFixed(4)) : 0,
    })).sort((a, b) => b.leads - a.leads)

    res.json({ success: true, data: { dateRange: { startDate, endDate }, report } })
  } catch (err) {
    next(err)
  }
})

/* ─────────── 期商映射管理 ─────────── */

// GET /api/v1/merchants/merchant-mappings
router.get('/merchant-mappings', async (req, res, next) => {
  try {
    const rows = await prisma.merchantMapping.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/merchants/merchant-mappings
router.post('/merchant-mappings', async (req, res, next) => {
  try {
    const { qsId, merchantName } = req.body
    if (!qsId || !merchantName) {
      res.status(400).json({ success: false, message: 'qsId 和 merchantName 必填' })
      return
    }

    const normalizedQsId = String(qsId).trim()
    const normalizedName = String(merchantName).trim()

    const existing = await prisma.merchantMapping.findFirst({
      where: { qsId: normalizedQsId },
    })

    let row
    if (existing) {
      row = await prisma.merchantMapping.update({
        where: { id: existing.id },
        data: { merchantName: normalizedName },
      })
    } else {
      row = await prisma.merchantMapping.create({
        data: { qsId: normalizedQsId, merchantName: normalizedName },
      })
    }

    res.json({ success: true, data: row })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/merchants/merchant-mappings/:id
router.delete('/merchant-mappings/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await prisma.merchantMapping.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
