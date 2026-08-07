import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { createMulterUpload, parseBuffer, parseRows, normalizeDate } from '../../utils/upload'
import { toNum, calcCtr } from '../../utils/formulas'
import { MEDIA_HEADERS } from '../../utils/mediaHeaders'
import {
  ingestRows,
  dedupeRows,
  looksLikeSwappedCampaign,
  type IngestRow,
  type RowError,
  type UploadBackup,
} from '../../utils/ingest'

const router = Router()
const upload = createMulterUpload()

const TRANSACTION_OPTIONS = { timeout: 60000, maxWait: 10000 }

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
    const normalizedChannel = (chMap.get(channel.toLowerCase()) || channel.toLowerCase())

    // ===== 全量校验：任何一行不合格则整体拒绝，不入库 =====
    const errors: RowError[] = []
    interface MediaRow {
      recordDate: string
      campaignId: string
      campaignName: string | null
      impressions: number
      clicks: number
      cost: number
      downloads: number
    }
    const mediaRows: MediaRow[] = []

    const parsedRows = parseRows(raw, MEDIA_HEADERS)
    parsedRows.forEach((r, idx) => {
      const excelRow = idx + 2 // 含表头的实际行号
      const d = normalizeDate(r.recordDate)
      const campaignId = String(r.campaignId ?? '').trim()
      if (!d) {
        errors.push({ row: excelRow, reason: `日期无法识别（值：${String(r.recordDate ?? '').slice(0, 30) || '空'}）` })
        return
      }
      if (!campaignId) {
        errors.push({ row: excelRow, reason: '计划ID为空' })
        return
      }
      mediaRows.push({
        recordDate: d,
        campaignId,
        campaignName: r.campaignName ? String(r.campaignName).trim() : null,
        impressions: toNum(r.impressions),
        clicks: toNum(r.clicks),
        cost: toNum(r.cost),
        downloads: toNum(r.downloads),
      })
    })

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: `共 ${errors.length} 行数据校验未通过，未入库任何数据，请修正后重新上传`,
        data: { errorCount: errors.length, errors: errors.slice(0, 20) },
      })
      return
    }

    if (mediaRows.length === 0) {
      res.status(400).json({ success: false, message: '未能解析到任何有效数据，请检查表头和格式' })
      return
    }

    // ===== 计划ID / 计划名称填反检测 =====
    const swapped = mediaRows.filter((r) => looksLikeSwappedCampaign(r.campaignId, r.campaignName))
    if (swapped.length > 0 && swapped.length / mediaRows.length >= 0.5) {
      res.status(400).json({
        success: false,
        message: `疑似「计划ID」与「计划名称」两列填反（${swapped.length}/${mediaRows.length} 行的名称列是纯数字而ID列是文本），未入库任何数据，请检查文件后重新上传`,
        data: {
          errorCount: swapped.length,
          errors: swapped.slice(0, 10).map((r) => ({
            row: 0,
            reason: `计划ID="${r.campaignId.slice(0, 30)}"，计划名称="${r.campaignName}"`,
          })),
        },
      })
      return
    }

    // 文件内主键去重（保留最后一行）
    const { rows: uniqueRows, duplicateCount } = dedupeRows(
      mediaRows.map((r) => ({ ...r, channel: normalizedChannel })),
    )

    // 批量加载该渠道的 ConvData 用于匹配（只读，无需放进事务）
    const allDates = [...new Set(uniqueRows.map((r) => r.recordDate))]
    const convRows = await prisma.convData.findMany({
      where: {
        channel: normalizedChannel,
        recordDate: { in: allDates.map((d) => new Date(d)) },
      },
    })
    const convMap = new Map<string, { activations: number; formalActivations: number; leads: number; accounts: number }>()
    for (const c of convRows) {
      convMap.set(`${c.recordDate.toISOString().slice(0, 10)}__${c.campaignId}`, {
        activations: c.activations,
        formalActivations: c.formalActivations,
        leads: c.leads,
        accounts: c.accounts,
      })
    }

    let matchedCount = 0
    const ingestInput: IngestRow[] = uniqueRows.map((row) => {
      const conv = convMap.get(`${row.recordDate}__${row.campaignId}`)
      if (conv) matchedCount++
      return {
        channel: normalizedChannel,
        recordDate: row.recordDate,
        campaignId: row.campaignId,
        data: {
          campaignName: row.campaignName,
          impressions: row.impressions,
          clicks: row.clicks,
          cost: row.cost,
          downloads: row.downloads,
          ctr: calcCtr(row.clicks, row.impressions),
          activations: conv?.activations ?? 0,
          formalActivations: conv?.formalActivations ?? 0,
          leads: conv?.leads ?? 0,
          accounts: conv?.accounts ?? 0,
        },
      }
    })

    // ===== 事务化入库：全部成功才提交，失败整体回滚 =====
    const result = await prisma.$transaction(async (tx) => {
      const uploadLog = await tx.uploadLog.create({
        data: {
          filename: req.file!.originalname,
          recordCount: uniqueRows.length,
          insertedCount: 0,
          updatedCount: 0,
          failedCount: 0,
          uploadedBy: req.body.uploadedBy || req.user?.username || null,
        },
      })

      const ingestResult = await ingestRows(tx, 'rawData', ingestInput, uploadLog.id)

      const backup: UploadBackup = { rawData: ingestResult.backup }
      await tx.uploadLog.update({
        where: { id: uploadLog.id },
        data: {
          insertedCount: ingestResult.insertedCount,
          updatedCount: ingestResult.updatedCount,
          backupData: JSON.stringify(backup),
        },
      })

      return { uploadLogId: uploadLog.id, ...ingestResult }
    }, TRANSACTION_OPTIONS)

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        channel: normalizedChannel,
        uploadLogId: result.uploadLogId,
        totalRecords: uniqueRows.length,
        duplicateCount,
        matchedCount,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
        unmatchedCount: uniqueRows.length - matchedCount,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
