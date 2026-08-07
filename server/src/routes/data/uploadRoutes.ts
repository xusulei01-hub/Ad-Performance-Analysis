import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { createMulterUpload, parseBuffer, parseRows, normalizeDate, toUtf8Filename } from '../../utils/upload'
import { toNum } from '../../utils/formulas'
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

async function getChannelMappings(): Promise<Map<string, string>> {
  const rows = await prisma.channelMapping.findMany()
  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(row.sourceName.toLowerCase(), row.targetName)
  }
  return map
}

// POST /api/v1/data/upload — 旧版双文件上传（媒体表 + 转化表）
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
    const combinedName = `${toUtf8Filename(mediaBuf.originalname)} + ${toUtf8Filename(convBuf.originalname)}`

    const mediaRaw = parseBuffer(mediaBuf.buffer, mediaBuf.originalname)
    const convRaw = parseBuffer(convBuf.buffer, convBuf.originalname)

    if (mediaRaw.length < 2 || convRaw.length < 2) {
      res.status(400).json({ success: false, message: '上传文件为空或没有数据行' })
      return
    }

    const chMap = await getChannelMappings()
    const normalizeChannel = (name: string): string => {
      const key = String(name).trim().toLowerCase()
      return chMap.get(key) || key
    }

    // ===== 全量校验（媒体表）：任何一行不合格则整体拒绝 =====
    const errors: RowError[] = []
    interface MediaRow {
      channel: string
      recordDate: string
      campaignId: string
      campaignName: string | null
      impressions: number
      clicks: number
      cost: number
      downloads: number
    }
    const mediaParsed: MediaRow[] = []
    parseRows(mediaRaw, MEDIA_HEADERS).forEach((r, idx) => {
      const excelRow = idx + 2
      const d = normalizeDate(r.recordDate)
      const channel = normalizeChannel(String(r.channel ?? ''))
      const campaignId = String(r.campaignId ?? '').trim()
      if (!d) {
        errors.push({ row: excelRow, reason: `【媒体表】日期无法识别（值：${String(r.recordDate ?? '').slice(0, 30) || '空'}）` })
        return
      }
      if (!channel) {
        errors.push({ row: excelRow, reason: '【媒体表】渠道为空' })
        return
      }
      if (!campaignId) {
        errors.push({ row: excelRow, reason: '【媒体表】计划ID为空' })
        return
      }
      mediaParsed.push({
        channel,
        recordDate: d,
        campaignId,
        campaignName: r.campaignName ? String(r.campaignName).trim() : null,
        impressions: toNum(r.impressions),
        clicks: toNum(r.clicks),
        cost: toNum(r.cost),
        downloads: toNum(r.downloads),
      })
    })

    // ===== 全量校验（转化表） =====
    interface ConvRow {
      channel: string
      recordDate: string
      campaignId: string
      activations: number
      formalActivations: number
      leads: number
      accounts: number
    }
    const convParsed: ConvRow[] = []
    parseRows(convRaw, CONV_HEADERS).forEach((r, idx) => {
      const excelRow = idx + 2
      const d = normalizeDate(r.recordDate)
      const channel = normalizeChannel(String(r.channel ?? ''))
      const campaignId = String(r.campaignId ?? '').trim()
      if (!d) {
        errors.push({ row: excelRow, reason: `【转化表】日期无法识别（值：${String(r.recordDate ?? '').slice(0, 30) || '空'}）` })
        return
      }
      if (!channel) {
        errors.push({ row: excelRow, reason: '【转化表】渠道为空' })
        return
      }
      if (!campaignId) {
        errors.push({ row: excelRow, reason: '【转化表】计划ID为空' })
        return
      }
      convParsed.push({
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

    // ===== 媒体表计划ID / 计划名称填反检测 =====
    const swapped = mediaParsed.filter((r) => looksLikeSwappedCampaign(r.campaignId, r.campaignName))
    if (swapped.length > 0 && swapped.length / mediaParsed.length >= 0.5) {
      res.status(400).json({
        success: false,
        message: `媒体表疑似「计划ID」与「计划名称」两列填反（${swapped.length}/${mediaParsed.length} 行的名称列是纯数字而ID列是文本），未入库任何数据，请检查文件后重新上传`,
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
    const { rows: mediaRows } = dedupeRows(mediaParsed)
    const { rows: convRows } = dedupeRows(convParsed)

    const convMap = new Map<string, ConvRow>()
    for (const c of convRows) {
      convMap.set(`${c.channel}__${c.recordDate}__${c.campaignId}`, c)
    }

    const ingestInput: IngestRow[] = []
    const unmatchedMedia: MediaRow[] = []

    for (const m of mediaRows) {
      const key = `${m.channel}__${m.recordDate}__${m.campaignId}`
      const c = convMap.get(key)
      if (c) {
        ingestInput.push({
          channel: m.channel,
          recordDate: m.recordDate,
          campaignId: m.campaignId,
          data: {
            campaignName: m.campaignName,
            impressions: m.impressions,
            clicks: m.clicks,
            cost: m.cost,
            downloads: m.downloads,
            activations: c.activations,
            formalActivations: c.formalActivations,
            leads: c.leads,
            accounts: c.accounts,
            ctr: m.impressions > 0 ? Number((m.clicks / m.impressions).toFixed(4)) : 0,
          },
        })
        convMap.delete(key)
      } else {
        unmatchedMedia.push(m)
      }
    }

    if (ingestInput.length === 0) {
      const mediaChannels = [...new Set(mediaRows.map((r) => r.channel))].slice(0, 10)
      const convChannels = [...new Set(convRows.map((r) => r.channel))].slice(0, 10)
      const mediaDates = [...new Set(mediaRows.map((r) => r.recordDate))].slice(0, 5)
      const convDates = [...new Set(convRows.map((r) => r.recordDate))].slice(0, 5)
      const mediaCampaignIds = mediaRows.slice(0, 3).map((r) => r.campaignId)
      const convCampaignIds = convRows.slice(0, 3).map((r) => r.campaignId)

      res.status(400).json({
        success: false,
        message: '两份文件未能匹配到任何数据，请检查日期格式和计划ID是否一致',
        data: {
          mediaRows: mediaRows.length,
          convRows: convRows.length,
          matchedCount: 0,
          unmatchedMediaCount: unmatchedMedia.length,
          unmatchedConvCount: convMap.size,
          diagnosis: {
            mediaChannels,
            convChannels,
            mediaDates,
            convDates,
            mediaCampaignIds,
            convCampaignIds,
            suggestion: !mediaChannels.some((c) => convChannels.includes(c))
              ? '渠道名称不一致，请添加渠道映射规则（如 mi → xiaomi）'
              : !mediaDates.some((d) => convDates.includes(d))
                ? '日期没有交集，请检查两份文件的日期范围是否一致'
                : '计划ID不一致，请检查两边的计划ID格式是否相同',
          },
        },
      })
      return
    }

    // ===== 事务化入库：全部成功才提交，失败整体回滚 =====
    const result = await prisma.$transaction(async (tx) => {
      const uploadLog = await tx.uploadLog.create({
        data: {
          filename: combinedName,
          recordCount: ingestInput.length,
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
        filename: combinedName,
        uploadLogId: result.uploadLogId,
        totalRecords: ingestInput.length,
        mediaRows: mediaRows.length,
        convRows: convRows.length,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
        unmatchedMediaCount: unmatchedMedia.length,
        unmatchedConvCount: convMap.size,
        preview: ingestInput.slice(0, 5).map((r) => ({
          channel: r.channel,
          recordDate: r.recordDate,
          campaignId: r.campaignId,
          ...(r.data as Record<string, unknown>),
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
