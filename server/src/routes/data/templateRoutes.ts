import { Router } from 'express'
import * as XLSX from 'xlsx'

const router = Router()

// GET /api/v1/data/templates/media — 下载媒体表标准模板
router.get('/templates/media', (_req, res, next) => {
  try {
    const rows = [
      ['日期', '计划ID', '品种/名称', '展示', '点击', '花费', '下载'],
      ['2026-07-01', '2143573311', '品牌词', 943, 197, 6297.58, 147],
      ['2026-07-01', '2143573500', '同花顺', 1585, 65, 1513.57, 42],
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '媒体表模板')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="media-template.xlsx"')
    res.send(buffer)
  } catch (err) {
    next(err)
  }
})

export default router
