import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { createMulterUpload, parseBuffer, parseRows, normalizeDate } from '../../utils/upload'
import { toNum } from '../../utils/formulas'
import { requireAdmin } from '../../middleware/authorize'
import {
  ingestRows,
  dedupeRows,
  type IngestRow,
  type RowError,
  type UploadBackup,
} from '../../utils/ingest'

const router = Router()
const upload = createMulterUpload()

const TRANSACTION_OPTIONS = { timeout: 60000, maxWait: 10000 }

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
    const normalizeChannel = (name: string): string => {
      const key = String(name).trim().toLowerCase()
      return chMap.get(key) || key
    }

    // ===== 全量校验：任何一行不合格则整体拒绝，不入库 =====
    const errors: RowError[] = []
    interface ConvRow {
      channel: string
      recordDate: string
      campaignId: string
      activations: number
      formalActivations: number
      leads: number
      accounts: number
    }
    const parsed: ConvRow[] = []

    parseRows(raw, CONV_HEADERS).forEach((r, idx) => {
      const excelRow = idx + 2
      const d = normalizeDate(r.recordDate)
      const channel = normalizeChannel(String(r.channel ?? ''))
      const campaignId = String(r.campaignId ?? '').trim()
      if (!d) {
        errors.push({ row: excelRow, reason: `日期无法识别（值：${String(r.recordDate ?? '').slice(0, 30) || '空'}）` })
        return
      }
      if (!channel) {
        errors.push({ row: excelRow, reason: '渠道为空' })
        return
      }
      if (!campaignId) {
        errors.push({ row: excelRow, reason: '计划ID为空' })
        return
      }
      parsed.push({
        channel,
        recordDate: d,
        campaignId,
        activations: toNum(r.activations),
        formalActivations: toNum(r.formalActivations),
        leads: toNum(r.leads),
        accounts: toNum(r.accounts),
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

    if (parsed.length === 0) {
      res.status(400).json({ success: false, message: '未能解析到任何有效数据，请检查表头和格式' })
      return
    }

    // 文件内主键去重（保留最后一行）
    const { rows: uniqueRows, duplicateCount } = dedupeRows(parsed)

    const ingestInput: IngestRow[] = uniqueRows.map((row) => ({
      channel: row.channel,
      recordDate: row.recordDate,
      campaignId: row.campaignId,
      data: {
        activations: row.activations,
        formalActivations: row.formalActivations,
        leads: row.leads,
        accounts: row.accounts,
      },
    }))

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

      const ingestResult = await ingestRows(tx, 'convData', ingestInput, uploadLog.id)

      const backup: UploadBackup = { convData: ingestResult.backup }
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
        uploadLogId: result.uploadLogId,
        totalRecords: uniqueRows.length,
        duplicateCount,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
