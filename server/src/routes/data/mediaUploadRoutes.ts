import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { createMulterUpload, parseBuffer, parseRows, normalizeDate } from '../../utils/upload'
import { toNum, calcCtr } from '../../utils/formulas'
import { requireChannelPermission } from '../../middleware/authorize'
import type { ParsedMedia } from '../../types'

const router = Router()
const upload = createMulterUpload()

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

// POST /api/v1/data/upload-media — 按渠道上传媒体数据表
router.post('/upload-media', upload.single('file'), async (req, res, next) => {
  try {
    const channel = req.body.channel ? String(req.body.channel).trim() : ''
    if (!channel) {
      res.status(400).json({ success: false, message: '请先选择渠道再上传媒体数据表' })
      return
    }

    // 校验渠道权限
    if (req.user?.role !== 'admin' && req.user?.permittedChannels !== null) {
      const userChannels = req.user?.permittedChannels || []
      if (!userChannels.includes(channel)) {
        res.status(403).json({ success: false, message: `没有渠道 ${channel} 的上传权限` })
        return
      }
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: '请上传媒体数据表文件' })
      return
    }

    const raw = parseBuffer(req.file.buffer, req.file.originalname)
    if (raw.length < 2) {
      res.status(400).json({ success: false, message: '上传文件为空或没有数据行' })
      return
    }

    // 获取渠道映射
    const mappings = await prisma.channelMapping.findMany()
    const chMap = new Map<string, string>()
    for (const row of mappings) {
      chMap.set(row.sourceName.toLowerCase(), row.targetName)
    }

    function normalizeChannel(name: string): string {
      const key = String(name).trim().toLowerCase()
      return chMap.get(key) || key
    }

    const mediaRows: ParsedMedia[] = parseRows(raw, MEDIA_HEADERS)
      .map((r) => {
        const d = normalizeDate(r.recordDate)
        if (!d) return null
        const campaignId = String(r.campaignId || '').trim()
        if (!campaignId) return null
        return {
          channel: normalizeChannel(String(r.channel || channel)), // 优先用文件中的渠道，fallback 到选择的渠道
          recordDate: d,
          campaignId,
          campaignName: r.campaignName ? String(r.campaignName).trim() : null,
          impressions: toNum(r.impressions),
          clicks: toNum(r.clicks),
          cost: toNum(r.cost),
          downloads: toNum(r.downloads),
        }
      })
      .filter((r): r is ParsedMedia => r !== null)

    if (mediaRows.length === 0) {
      res.status(400).json({ success: false, message: '未能解析到任何有效数据，请检查表头和格式' })
      return
    }

    // 创建上传记录
    const uploadLog = await prisma.uploadLog.create({
      data: {
        filename: req.file.originalname,
        recordCount: mediaRows.length,
        insertedCount: 0,
        updatedCount: 0,
        failedCount: 0,
        uploadedBy: req.body.uploadedBy || null,
      },
    })
    const uploadLogId = uploadLog.id

    // 批量加载该渠道的 ConvData 用于匹配
    const allDates = [...new Set(mediaRows.map((r) => r.recordDate))]
    const convRows = await prisma.convData.findMany({
      where: {
        channel,
        recordDate: { in: allDates.map((d) => new Date(d)) },
      },
    })

    const convMap = new Map<string, { activations: number; formalActivations: number; leads: number; accounts: number }>()
    for (const c of convRows) {
      const key = `${c.recordDate.toISOString().slice(0, 10)}__${c.campaignId}`
      convMap.set(key, {
        activations: c.activations,
        formalActivations: c.formalActivations,
        leads: c.leads,
        accounts: c.accounts,
      })
    }

    let insertedCount = 0
    let updatedCount = 0
    let matchedCount = 0

    for (const row of mediaRows) {
      const matchKey = `${row.recordDate}__${row.campaignId}`
      const conv = convMap.get(matchKey)
      const rowChannel = normalizeChannel(String(row.channel || channel))

      const data: any = {
        channel: rowChannel,
        recordDate: new Date(row.recordDate),
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        impressions: row.impressions,
        clicks: row.clicks,
        cost: row.cost,
        downloads: row.downloads,
        ctr: calcCtr(row.clicks, row.impressions),
      }

      if (conv) {
        matchedCount++
        data.activations = conv.activations
        data.formalActivations = conv.formalActivations
        data.leads = conv.leads
        data.accounts = conv.accounts
      } else {
        data.activations = 0
        data.formalActivations = 0
        data.leads = 0
        data.accounts = 0
      }

      // UPSERT by (channel, recordDate, campaignId)
      const existing = await prisma.rawData.findFirst({
        where: { channel: rowChannel, recordDate: new Date(row.recordDate), campaignId: row.campaignId },
      })

      if (existing) {
        await prisma.rawData.update({ where: { id: existing.id }, data: { ...data, uploadLogId } })
        updatedCount++
      } else {
        await prisma.rawData.create({ data: { ...data, uploadLogId } })
        insertedCount++
      }
    }

    // 更新上传记录
    await prisma.uploadLog.update({
      where: { id: uploadLogId },
      data: { insertedCount, updatedCount },
    })

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        channel,
        totalRecords: mediaRows.length,
        matchedCount,
        insertedCount,
        updatedCount,
        unmatchedCount: mediaRows.length - matchedCount,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
