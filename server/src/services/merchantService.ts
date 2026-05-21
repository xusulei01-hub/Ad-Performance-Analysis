import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'
import { parseBuffer, parseRows, normalizeDate } from '../utils/upload'
import { toEndOfDay } from '../utils/date'
import { COST_PER_MERCHANT_LEAD } from '../constants'
import type { ParsedMerchantRow } from '../types'

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

export async function processMerchantUpload(file: Express.Multer.File) {
  const raw = parseBuffer(file.buffer, file.originalname)
  if (raw.length < 2) {
    return { success: false as const, message: '上传文件为空或没有数据行' }
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
      return { userId, qsId, channel, leadDate, accountDate }
    })
    .filter((r): r is ParsedMerchantRow => r !== null)

  if (parsed.length === 0) {
    return { success: false as const, message: '未能解析到任何有效数据，请检查表头和格式' }
  }

  // 去重：相同 user_id 保留第一条
  const seen = new Set<string>()
  const uniqueParsed: ParsedMerchantRow[] = []
  for (const row of parsed) {
    if (!seen.has(row.userId)) {
      seen.add(row.userId)
      uniqueParsed.push(row)
    }
  }

  const existingRows = await prisma.merchantData.findMany({
    where: { userId: { in: uniqueParsed.map((r) => r.userId) } },
    select: { id: true, userId: true },
  })
  const existingMap = new Map(existingRows.map((r) => [r.userId, r.id]))

  const toInsert: any[] = []
  const toUpdate: { id: number; data: any }[] = []

  for (const row of uniqueParsed) {
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

  const BATCH_SIZE = 200
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    await prisma.merchantData.createMany({ data: batch })
  }

  for (const { id, data } of toUpdate) {
    await prisma.merchantData.update({ where: { id }, data })
  }

  return {
    success: true as const,
    data: {
      filename: file.originalname,
      totalRecords: uniqueParsed.length,
      insertedCount: toInsert.length,
      updatedCount: toUpdate.length,
    },
  }
}

export async function getMerchantReport(startDate: string, endDate: string, qsIdFilter?: string[], channelFilter?: string[]) {
  const where: any = {
    leadDate: {
      gte: new Date(startDate),
      lte: toEndOfDay(endDate),
    },
  }
  if (qsIdFilter && qsIdFilter.length > 0) where.qsId = { in: qsIdFilter }
  if (channelFilter && channelFilter.length > 0) where.channel = { in: channelFilter }

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
    const cost = data.leads * COST_PER_MERCHANT_LEAD
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

  return { dateRange: { startDate, endDate }, report }
}

export async function getChannelReport(startDate: string, endDate: string, qsIdFilter?: string[], channelFilter?: string[]) {
  const where: any = {
    leadDate: {
      gte: new Date(startDate),
      lte: toEndOfDay(endDate),
    },
  }
  if (qsIdFilter && qsIdFilter.length > 0) where.qsId = { in: qsIdFilter }
  if (channelFilter && channelFilter.length > 0) where.channel = { in: channelFilter }

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

  return { dateRange: { startDate, endDate }, report }
}
