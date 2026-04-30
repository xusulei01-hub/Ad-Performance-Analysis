import multer from 'multer'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { FILE_SIZE_LIMIT } from '../constants'

/**
 * 创建配置好的 multer 实例
 */
export function createMulterUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter: (req, file, cb) => {
      const ext = file.originalname.toLowerCase()
      if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
        cb(null, true)
      } else {
        cb(new Error('仅支持 .xlsx / .xls / .csv 格式文件'))
      }
    },
  })
}

/**
 * 解析 Buffer（CSV 或 Excel）为二维数组
 */
export function parseBuffer(buffer: Buffer, filename: string): unknown[][] {
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

/**
 * 统一日期格式化为 YYYY-MM-DD
 */
export function normalizeDate(val: unknown): string | null {
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

/**
 * 按表头映射解析数据行（支持大小写/空格模糊匹配）
 */
export function parseRows(
  rows: unknown[][],
  headerMap: Record<string, string>,
): Array<Record<string, unknown>> {
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
      const dbKey =
        fuzzyHeaderMap.get(h) ||
        fuzzyHeaderMap.get(h.toLowerCase()) ||
        fuzzyHeaderMap.get(h.replace(/\s+/g, '')) ||
        fuzzyHeaderMap.get(h.toLowerCase().replace(/\s+/g, ''))
      if (dbKey) obj[dbKey] = row[j]
    }
    out.push(obj)
  }
  return out
}
