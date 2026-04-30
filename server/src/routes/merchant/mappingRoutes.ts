import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { createMulterUpload, parseBuffer, parseRows } from '../../utils/upload'
import { requireFields } from '../../middleware/validate'

const router = Router()
const upload = createMulterUpload()

// GET /api/v1/merchants/merchant-mappings
router.get('/merchant-mappings', async (req, res, next) => {
  try {
    const rows = await prisma.merchantMapping.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/merchants/merchant-mappings
router.post('/merchant-mappings', requireFields('qsId', 'merchantName'), async (req, res, next) => {
  try {
    const normalizedQsId = String(req.body.qsId).trim()
    const normalizedName = String(req.body.merchantName).trim()

    const existing = await prisma.merchantMapping.findFirst({
      where: { qsId: normalizedQsId },
    })

    let row
    if (existing) {
      row = await prisma.merchantMapping.update({
        where: { id: existing.id },
        data: { merchantName: normalizedName },
      })
    } else {
      row = await prisma.merchantMapping.create({
        data: { qsId: normalizedQsId, merchantName: normalizedName },
      })
    }

    res.json({ success: true, data: row })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/merchants/merchant-mappings/import
router.post('/merchant-mappings/import', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ success: false, message: '请上传文件' })
      return
    }

    const raw = parseBuffer(file.buffer, file.originalname)
    if (raw.length < 2) {
      res.status(400).json({ success: false, message: '文件为空或没有数据行' })
      return
    }

    const MAPPING_HEADERS: Record<string, string> = {
      '期商id': 'qsId',
      '期商ID': 'qsId',
      'qs_id': 'qsId',
      'qsId': 'qsId',
      '期商名称': 'merchantName',
      'merchantName': 'merchantName',
    }

    const rows = parseRows(raw, MAPPING_HEADERS)
      .map((r) => ({
        qsId: String(r.qsId || '').trim(),
        merchantName: String(r.merchantName || '').trim(),
      }))
      .filter((r) => r.qsId && r.merchantName)

    if (rows.length === 0) {
      res.status(400).json({ success: false, message: '未能解析到有效映射数据，请检查表头是否包含「期商id」和「期商名称」' })
      return
    }

    let createdCount = 0
    let updatedCount = 0

    for (const row of rows) {
      const existing = await prisma.merchantMapping.findFirst({
        where: { qsId: row.qsId },
      })

      if (existing) {
        await prisma.merchantMapping.update({
          where: { id: existing.id },
          data: { merchantName: row.merchantName },
        })
        updatedCount++
      } else {
        await prisma.merchantMapping.create({
          data: { qsId: row.qsId, merchantName: row.merchantName },
        })
        createdCount++
      }
    }

    res.json({
      success: true,
      data: {
        total: rows.length,
        createdCount,
        updatedCount,
      },
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/merchants/merchant-mappings/:id
router.delete('/merchant-mappings/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await prisma.merchantMapping.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
