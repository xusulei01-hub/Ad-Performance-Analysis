import { Prisma } from '@prisma/client'
import dayjs from 'dayjs'

/**
 * 上传入库共享助手
 * - ingestRows：在一个事务内批量写入（createMany + 逐条 update），并生成撤销快照
 * - 快照包含：本次新插入行的 id 列表 + 被更新行的完整旧值，供撤销时精确回滚
 */

export type Tx = Prisma.TransactionClient

export interface RowError {
  row: number // Excel 行号（含表头，从 2 开始）
  reason: string
}

export interface IngestRow {
  channel: string
  recordDate: string // YYYY-MM-DD
  campaignId: string
  /** 除主键（channel/recordDate/campaignId）外要写入的标量字段 */
  data: Record<string, unknown>
}

export interface TableBackup {
  insertedIds: number[]
  updatedRows: Array<Record<string, unknown>>
}

export interface UploadBackup {
  rawData?: TableBackup
  convData?: TableBackup
}

const CHUNK_SIZE = 200

function rowKey(channel: string, recordDate: string, campaignId: string): string {
  return `${channel}__${recordDate}__${campaignId}`
}

/**
 * 事务内批量写入 raw_data / conv_data。
 * 存在则更新（更新前先把旧值存入快照），不存在则批量插入。
 */
export async function ingestRows(
  tx: Tx,
  table: 'rawData' | 'convData',
  rows: IngestRow[],
  uploadLogId: number,
): Promise<{ insertedCount: number; updatedCount: number; backup: TableBackup }> {
  const model = (tx as any)[table]

  const allDates = [...new Set(rows.map((r) => r.recordDate))]
  const allChannels = [...new Set(rows.map((r) => r.channel))]
  const allCampaignIds = [...new Set(rows.map((r) => r.campaignId))]

  const existing = await model.findMany({
    where: {
      channel: { in: allChannels },
      recordDate: { in: allDates.map((d) => new Date(d)) },
      campaignId: { in: allCampaignIds },
    },
  })
  const existingMap = new Map<string, Record<string, unknown>>()
  for (const r of existing) {
    existingMap.set(rowKey(r.channel, dayjs(r.recordDate).format('YYYY-MM-DD'), r.campaignId), r)
  }

  const toCreate: Array<Record<string, unknown>> = []
  const toUpdate: Array<{ id: number; data: Record<string, unknown> }> = []
  const backup: TableBackup = { insertedIds: [], updatedRows: [] }

  for (const row of rows) {
    const key = rowKey(row.channel, row.recordDate, row.campaignId)
    const found = existingMap.get(key)
    const data = {
      ...row.data,
      channel: row.channel,
      recordDate: new Date(row.recordDate),
      campaignId: row.campaignId,
      uploadLogId,
    }
    if (found) {
      backup.updatedRows.push(found)
      toUpdate.push({ id: found.id as number, data })
    } else {
      toCreate.push(data)
    }
  }

  // 批量插入（每批 200 条，避免 SQLite 变量数限制）
  for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
    await model.createMany({ data: toCreate.slice(i, i + CHUNK_SIZE) })
  }

  // 逐条更新（同一事务内）
  for (const u of toUpdate) {
    await model.update({ where: { id: u.id }, data: u.data })
  }

  // 取回本次新插入行的 id（更新行不在 createKeySet 中，靠 key 精确过滤）
  if (toCreate.length > 0) {
    const createKeySet = new Set(
      rows
        .filter((r) => !existingMap.has(rowKey(r.channel, r.recordDate, r.campaignId)))
        .map((r) => rowKey(r.channel, r.recordDate, r.campaignId)),
    )
    const inserted = await model.findMany({
      where: { uploadLogId },
      select: { id: true, channel: true, recordDate: true, campaignId: true },
    })
    backup.insertedIds = inserted
      .filter((r: any) =>
        createKeySet.has(rowKey(r.channel, dayjs(r.recordDate).format('YYYY-MM-DD'), r.campaignId)),
      )
      .map((r: any) => r.id as number)
  }

  return { insertedCount: toCreate.length, updatedCount: toUpdate.length, backup }
}

/** 文件内按主键去重（保留最后一行，与"覆盖"语义一致） */
export function dedupeRows<T extends { channel: string; recordDate: string; campaignId: string }>(
  rows: T[],
): { rows: T[]; duplicateCount: number } {
  const map = new Map<string, T>()
  for (const r of rows) {
    map.set(rowKey(r.channel, r.recordDate, r.campaignId), r)
  }
  return { rows: [...map.values()], duplicateCount: rows.length - map.size }
}

/**
 * 检测「计划ID」与「计划名称」两列疑似填反：
 * 名称列是纯数字（≥4 位，像 ID）且 ID 列含中文/字母等非纯数字内容。
 */
export function looksLikeSwappedCampaign(campaignId: string, campaignName: string | null): boolean {
  if (!campaignName) return false
  const nameIsIdLike = /^\d{4,}$/.test(campaignName.trim())
  const idIsPureDigits = /^\d+$/.test(campaignId.trim())
  return nameIsIdLike && !idIsPureDigits
}

const RESTORE_FIELDS: Record<'rawData' | 'convData', string[]> = {
  rawData: [
    'channel', 'recordDate', 'campaignId', 'campaignName', 'impressions', 'clicks',
    'cost', 'downloads', 'activations', 'formalActivations', 'leads', 'accounts',
    'ctr', 'uploadLogId',
  ],
  convData: [
    'channel', 'recordDate', 'campaignId', 'activations', 'formalActivations',
    'leads', 'accounts', 'uploadLogId',
  ],
}

/** 撤销时用快照旧值重建 update data */
export function buildRestoreData(
  table: 'rawData' | 'convData',
  row: Record<string, unknown>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const field of RESTORE_FIELDS[table]) {
    const value = row[field]
    if (field === 'recordDate') {
      data[field] = new Date(value as string)
    } else {
      data[field] = value === undefined ? null : value
    }
  }
  return data
}
