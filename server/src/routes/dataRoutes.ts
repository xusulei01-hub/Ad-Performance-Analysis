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

/* ─────────── 渠道映射 ─────────── */

async function getChannelMappings(): Promise<Map<string, string>> {
  const rows = await prisma.channelMapping.findMany()
  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(row.sourceName.toLowerCase(), row.targetName)
  }
  return map
}

function normalizeChannel(name: string, map: Map<string, string>): string {
  const key = String(name).trim().toLowerCase()
  return map.get(key) || String(name).trim()
}

/* ─────────── 日期统一 ─────────── */

/** 统一转成 YYYY-MM-DD */
function normalizeDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null

  const str = String(val).trim()

  // 已经是 YYYY-MM-DD 或 YYYY/MM/DD
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(str)) {
    return str.replace(/\//g, '-')
  }

  // YYYYMMDD（如 20250605）
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  }

  // Excel 序列号
  const num = Number(str)
  if (!Number.isNaN(num) && num > 30000 && num < 60000) {
    const d = XLSX.SSF.parse_date_code(num)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }

  // dayjs 兜底
  const d = dayjs(str, ['YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY-MM-DD HH:mm:ss'])
  if (d.isValid()) return d.format('YYYY-MM-DD')

  return null
}

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

/* ─────────── 媒体表解析 ─────────── */

const MEDIA_HEADERS: Record<string, string> = {
  '渠道': 'channel',
  '日期': 'recordDate',
  '计划id': 'campaignId',
  '计划ID': 'campaignId',
  '品种/名称（选填）': 'campaignName',
  '品种/名称': 'campaignName',
  '曝光': 'impressions',
  '点击': 'clicks',
  '花费': 'cost',
  '下载': 'downloads',
}

/* ─────────── 转化表解析 ─────────── */

const CONV_HEADERS: Record<string, string> = {
  '付费拉新时间': 'recordDate',
  '外部投放渠道': 'channel',
  '广告计划id': 'campaignId',
  '广告计划ID': 'campaignId',
  '激活用户数': 'activations',
  '转正激活新用户数': 'formalActivations',
  '留号码新用户数': 'leads',
  '累计开户用户数': 'accounts',
}

function parseRows(rows: unknown[][], headerMap: Record<string, string>): Array<Record<string, unknown>> {
  if (rows.length < 2) return []
  const headers = (rows[0] as string[]).map((h) => String(h).trim())
  const out: Array<Record<string, unknown>> = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as string[]
    const obj: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      const dbKey = headerMap[headers[j]]
      if (dbKey) obj[dbKey] = row[j]
    }
    out.push(obj)
  }
  return out
}

/* ─────────── 匹配 & 入库 ─────────── */

function toNum(v: unknown): number {
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

interface ParsedMedia {
  channel: string
  recordDate: string
  campaignId: string
  campaignName: string | null
  impressions: number
  clicks: number
  cost: number
  downloads: number
}

interface ParsedConv {
  channel: string
  recordDate: string
  campaignId: string
  activations: number
  formalActivations: number
  leads: number
  accounts: number
}

interface MatchedRow extends ParsedMedia {
  activations: number
  formalActivations: number
  leads: number
  accounts: number
  ctr: number
}

// POST /api/v1/data/upload
router.post('/upload', upload.fields([
  { name: 'mediaFile', maxCount: 1 },
  { name: 'convFile', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const files = req.files as { mediaFile?: Express.Multer.File[]; convFile?: Express.Multer.File[] }
    if (!files.mediaFile?.[0] || !files.convFile?.[0]) {
      res.status(400).json({ success: false, message: '需要同时上传媒体数据表和转化数据表' })
      return
    }

    const mediaBuf = files.mediaFile[0]
    const convBuf = files.convFile[0]

    // 1. 解析两份文件
    const mediaRaw = parseBuffer(mediaBuf.buffer, mediaBuf.originalname)
    const convRaw = parseBuffer(convBuf.buffer, convBuf.originalname)

    if (mediaRaw.length < 2 || convRaw.length < 2) {
      res.status(400).json({ success: false, message: '上传文件为空或没有数据行' })
      return
    }

    // 2. 读取渠道映射
    const chMap = await getChannelMappings()

    // 3. 解析媒体表
    const mediaParsed: ParsedMedia[] = parseRows(mediaRaw, MEDIA_HEADERS)
      .map((r) => {
        const d = normalizeDate(r.recordDate)
        if (!d) return null
        return {
          channel: normalizeChannel(String(r.channel || ''), chMap),
          recordDate: d,
          campaignId: String(r.campaignId || '').trim(),
          campaignName: r.campaignName ? String(r.campaignName).trim() : null,
          impressions: toNum(r.impressions),
          clicks: toNum(r.clicks),
          cost: toNum(r.cost),
          downloads: toNum(r.downloads),
        }
      })
      .filter((r): r is ParsedMedia => r !== null && !!r.channel && !!r.campaignId)

    // 4. 解析转化表
    const convParsed: ParsedConv[] = parseRows(convRaw, CONV_HEADERS)
      .map((r) => {
        const d = normalizeDate(r.recordDate)
        if (!d) return null
        return {
          channel: normalizeChannel(String(r.channel || ''), chMap),
          recordDate: d,
          campaignId: String(r.campaignId || '').trim(),
          activations: toNum(r.activations),
          formalActivations: toNum(r.formalActivations),
          leads: toNum(r.leads),
          accounts: toNum(r.accounts),
        }
      })
      .filter((r): r is ParsedConv => r !== null && !!r.channel && !!r.campaignId)

    // 5. 以 (渠道, 日期, 计划ID) 做匹配
    const convMap = new Map<string, ParsedConv>()
    for (const c of convParsed) {
      const key = `${c.channel}__${c.recordDate}__${c.campaignId}`
      convMap.set(key, c)
    }

    const matched: MatchedRow[] = []
    const unmatchedMedia: ParsedMedia[] = []

    for (const m of mediaParsed) {
      const key = `${m.channel}__${m.recordDate}__${m.campaignId}`
      const c = convMap.get(key)
      if (c) {
        matched.push({
          ...m,
          activations: c.activations,
          formalActivations: c.formalActivations,
          leads: c.leads,
          accounts: c.accounts,
          ctr: m.impressions > 0 ? Number((m.clicks / m.impressions).toFixed(4)) : 0,
        })
        convMap.delete(key)
      } else {
        unmatchedMedia.push(m)
      }
    }

    if (matched.length === 0) {
      res.status(400).json({
        success: false,
        message: '两份文件未能匹配到任何数据，请检查日期格式和计划ID是否一致',
        data: {
          mediaRows: mediaParsed.length,
          convRows: convParsed.length,
          matchedCount: 0,
          unmatchedMediaCount: unmatchedMedia.length,
          unmatchedConvCount: convMap.size,
        },
      })
      return
    }

    // 6. 事务入库
    let insertedCount = 0
    let updatedCount = 0

    await prisma.$transaction(async (tx) => {
      for (const row of matched) {
        const data = {
          channel: row.channel,
          recordDate: new Date(row.recordDate),
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          impressions: row.impressions,
          clicks: row.clicks,
          cost: row.cost,
          downloads: row.downloads,
          activations: row.activations,
          formalActivations: row.formalActivations,
          leads: row.leads,
          accounts: row.accounts,
          ctr: row.ctr,
        }

        const existing = await tx.rawData.findUnique({
          where: {
            unique_channel_date_campaign: {
              channel: row.channel,
              recordDate: new Date(row.recordDate),
              campaignId: row.campaignId,
            },
          },
          select: { id: true },
        })

        if (existing) {
          await tx.rawData.update({ where: { id: existing.id }, data })
          updatedCount++
        } else {
          await tx.rawData.create({ data })
          insertedCount++
        }
      }

      await tx.uploadLog.create({
        data: {
          filename: `${mediaBuf.originalname} + ${convBuf.originalname}`,
          recordCount: matched.length,
          insertedCount,
          updatedCount,
          failedCount: 0,
          uploadedBy: req.body.uploadedBy || null,
        },
      })
    })

    res.json({
      success: true,
      data: {
        filename: `${mediaBuf.originalname} + ${convBuf.originalname}`,
        totalRecords: matched.length,
        mediaRows: mediaParsed.length,
        convRows: convParsed.length,
        insertedCount,
        updatedCount,
        unmatchedMediaCount: unmatchedMedia.length,
        unmatchedConvCount: convMap.size,
        preview: matched.slice(0, 5).map((r) => ({
          channel: r.channel,
          recordDate: r.recordDate,
          campaignId: r.campaignId,
          campaignName: r.campaignName,
          cost: r.cost,
          impressions: r.impressions,
          clicks: r.clicks,
          downloads: r.downloads,
          activations: r.activations,
          formalActivations: r.formalActivations,
          leads: r.leads,
          accounts: r.accounts,
          ctr: r.ctr,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

/* ─────────── 渠道映射管理 ─────────── */

// GET /api/v1/data/channel-mappings
router.get('/channel-mappings', async (req, res, next) => {
  try {
    const rows = await prisma.channelMapping.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/data/channel-mappings
router.post('/channel-mappings', async (req, res, next) => {
  try {
    const { sourceName, targetName } = req.body
    if (!sourceName || !targetName) {
      res.status(400).json({ success: false, message: 'sourceName 和 targetName 必填' })
      return
    }
    const row = await prisma.channelMapping.upsert({
      where: { sourceName: String(sourceName).trim().toLowerCase() },
      update: { targetName: String(targetName).trim() },
      create: {
        sourceName: String(sourceName).trim().toLowerCase(),
        targetName: String(targetName).trim(),
      },
    })
    res.json({ success: true, data: row })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/data/channel-mappings/:id
router.delete('/channel-mappings/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await prisma.channelMapping.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

/* ─────────── 数据查询 ─────────── */

function toEndOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 999)
  return d
}

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
        skip: (page - 1) * pageSize,
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

    res.json({ success: true, data: { total, page, pageSize, logs } })
  } catch (err) {
    next(err)
  }
})

export default router
