import { Router } from 'express'
import dayjs from 'dayjs'
import { prisma } from '../../lib/prisma'
import { createMulterUpload, parseBuffer, parseRows, normalizeDate } from '../../utils/upload'
import { toNum } from '../../utils/formulas'
import type { ParsedMedia, ParsedConv, MatchedRow } from '../../types'

const router = Router()
const upload = createMulterUpload()

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
  return map.get(key) || key
}

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

    const mediaRaw = parseBuffer(mediaBuf.buffer, mediaBuf.originalname)
    const convRaw = parseBuffer(convBuf.buffer, convBuf.originalname)

    if (mediaRaw.length < 2 || convRaw.length < 2) {
      res.status(400).json({ success: false, message: '上传文件为空或没有数据行' })
      return
    }

    const chMap = await getChannelMappings()

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
      const mediaChannels = [...new Set(mediaParsed.map((r) => r.channel))].slice(0, 10)
      const convChannels = [...new Set(convParsed.map((r) => r.channel))].slice(0, 10)
      const mediaDates = [...new Set(mediaParsed.map((r) => r.recordDate))].slice(0, 5)
      const convDates = [...new Set(convParsed.map((r) => r.recordDate))].slice(0, 5)
      const mediaCampaignIds = mediaParsed.slice(0, 3).map((r) => r.campaignId)
      const convCampaignIds = convParsed.slice(0, 3).map((r) => r.campaignId)

      res.status(400).json({
        success: false,
        message: '两份文件未能匹配到任何数据，请检查日期格式和计划ID是否一致',
        data: {
          mediaRows: mediaParsed.length,
          convRows: convParsed.length,
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

    const uploadLog = await prisma.uploadLog.create({
      data: {
        filename: `${mediaBuf.originalname} + ${convBuf.originalname}`,
        recordCount: matched.length,
        insertedCount: 0,
        updatedCount: 0,
        failedCount: 0,
        uploadedBy: req.body.uploadedBy || null,
      },
    })
    const uploadLogId = uploadLog.id

    let insertedCount = 0
    let updatedCount = 0

    const allDates = [...new Set(matched.map((r) => r.recordDate))]
    const allChannels = [...new Set(matched.map((r) => r.channel))]
    const existingRows = await prisma.rawData.findMany({
      where: {
        recordDate: { in: allDates.map((d) => new Date(d)) },
        channel: { in: allChannels },
      },
      select: { id: true, channel: true, recordDate: true, campaignId: true, uploadLogId: true },
    })

    const existingMap = new Map<string, { id: number; uploadLogId: number | null }>()
    for (const r of existingRows) {
      const key = `${r.channel}__${dayjs(r.recordDate).format('YYYY-MM-DD')}__${r.campaignId}`
      existingMap.set(key, { id: r.id, uploadLogId: r.uploadLogId })
    }

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

      const key = `${row.channel}__${row.recordDate}__${row.campaignId}`
      const existing = existingMap.get(key)

      if (existing) {
        await prisma.rawData.update({ where: { id: existing.id }, data })
        updatedCount++
      } else {
        await prisma.rawData.create({ data: { ...data, uploadLogId } })
        insertedCount++
      }
    }

    await prisma.uploadLog.update({
      where: { id: uploadLogId },
      data: { insertedCount, updatedCount },
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

export default router
