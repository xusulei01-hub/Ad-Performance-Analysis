import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { parsePagination } from '../../utils/pagination'
import { PAGE_SIZES } from '../../constants'

const router = Router()

// GET /api/v1/data/upload-logs
router.get('/upload-logs', async (req, res, next) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query, PAGE_SIZES.UPLOAD_LOGS)

    const [total, logs] = await Promise.all([
      prisma.uploadLog.count(),
      prisma.uploadLog.findMany({
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ])

    res.json({ success: true, data: { total, page, pageSize, logs } })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/data/upload-logs/:id/rollback
router.delete('/upload-logs/:id/rollback', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const uploadLog = await prisma.uploadLog.findUnique({ where: { id } })
    if (!uploadLog) {
      res.status(404).json({ success: false, message: '上传记录不存在' })
      return
    }

    const deleteResult = await prisma.rawData.deleteMany({
      where: { uploadLogId: id },
    })

    await prisma.uploadLog.update({
      where: { id },
      data: { errorDetails: `已撤销，删除了 ${deleteResult.count} 条记录` },
    })

    res.json({
      success: true,
      data: {
        deletedCount: deleteResult.count,
        message: `已撤销上传，删除了 ${deleteResult.count} 条数据`,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
