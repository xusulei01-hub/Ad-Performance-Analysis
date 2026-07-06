import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { createMulterUpload, parseBuffer, parseRows, normalizeDate } from '../../utils/upload'
import { toNum } from '../../utils/formulas'
import { requireAdmin, requireChannelPermission } from '../../middleware/authorize'
import type { ParsedConv } from '../../types'

const router = Router()
const upload = createMulterUpload()

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

// POST /api/v1/data/upload-conv — 上传转化数据表（仅管理员）
router.post('/upload-conv', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: '请上传转化数据表文件' })
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

    const parsed: ParsedConv[] = parseRows(raw, CONV_HEADERS)
      .map((r) => {
        const d = normalizeDate(r.recordDate)
        if (!d) return null
        const channel = normalizeChannel(String(r.channel || ''))
        const campaignId = String(r.campaignId || '').trim()
        if (!channel || !campaignId) return null
        return {
          channel,
          recordDate: d,
          campaignId,
          activations: toNum(r.activations),
          formalActivations: toNum(r.formalActivations),
          leads: toNum(r.leads),
          accounts: toNum(r.accounts),
        }
      })
      .filter((r): r is ParsedConv => r !== null)

    if (parsed.length === 0) {
      res.status(400).json({ success: false, message: '未能解析到任何有效数据，请检查表头和格式' })
      return
    }

    // 创建上传记录
    const uploadLog = await prisma.uploadLog.create({
      data: {
        filename: req.file.originalname,
        recordCount: parsed.length,
        insertedCount: 0,
        updatedCount: 0,
        failedCount: 0,
        uploadedBy: req.body.uploadedBy || null,
      },
    })
    const uploadLogId = uploadLog.id

    let insertedCount = 0
    let updatedCount = 0

    for (const row of parsed) {
      const key = `${row.channel}__${row.recordDate}__${row.campaignId}`

      const data = {
        channel: row.channel,
        recordDate: new Date(row.recordDate),
        campaignId: row.campaignId,
        activations: row.activations,
        formalActivations: row.formalActivations,
        leads: row.leads,
        accounts: row.accounts,
      }

      // 先查 ConvData 是否存在
      const existing = await prisma.convData.findFirst({
        where: { channel: row.channel, recordDate: new Date(row.recordDate), campaignId: row.campaignId },
      })

      if (existing) {
        await prisma.convData.update({ where: { id: existing.id }, data: { ...data, uploadLogId } })
        updatedCount++
      } else {
        await prisma.convData.create({ data: { ...data, uploadLogId } })
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
        totalRecords: parsed.length,
        insertedCount,
        updatedCount,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
