import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { parsePagination } from '../../utils/pagination'
import { PAGE_SIZES } from '../../constants'
import { requireAdmin } from '../../middleware/authorize'
import { buildRestoreData, type TableBackup, type UploadBackup } from '../../utils/ingest'

const router = Router()

// GET /api/v1/data/upload-logs
router.get('/upload-logs', async (req, res, next) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query, PAGE_SIZES.UPLOAD_LOGS)

    const [total, logs, latestActive] = await Promise.all([
      prisma.uploadLog.count(),
      prisma.uploadLog.findMany({
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.uploadLog.findFirst({
        where: { rolledBackAt: null },
        orderBy: { id: 'desc' },
        select: { id: true },
      }),
    ])

    const logsWithFlag = logs.map((log) => ({
      ...log,
      hasBackup: !!log.backupData,
      canRollback: latestActive?.id === log.id,
      backupData: undefined, // 快照体积大，不下发到列表
    }))

    res.json({ success: true, data: { total, page, pageSize, logs: logsWithFlag } })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/data/upload-logs/:id/rollback — 撤销最近一次上传（仅管理员）
// 优先使用快照精确回滚：删除本次新增的行 + 恢复被更新行的旧值；全部在事务内完成
router.delete('/upload-logs/:id/rollback', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ success: false, message: '无效的上传记录 ID' })
      return
    }

    const uploadLog = await prisma.uploadLog.findUnique({ where: { id } })
    if (!uploadLog) {
      res.status(404).json({ success: false, message: '上传记录不存在' })
      return
    }
    if (uploadLog.rolledBackAt) {
      res.status(400).json({ success: false, message: '该次上传已撤销，不能重复撤销' })
      return
    }

    // 只允许撤销最近一次未撤销的上传，避免旧快照覆盖更新上传的数据
    const latestActive = await prisma.uploadLog.findFirst({
      where: { rolledBackAt: null, failedCount: 0 },
      orderBy: { id: 'desc' },
      select: { id: true },
    })
    if (!latestActive || latestActive.id !== id) {
      res.status(409).json({
        success: false,
        message: '只能撤销最近一次上传；如需撤销更早的记录，请先按顺序撤销比它新的上传',
      })
      return
    }

    let backup: UploadBackup | null = null
    if (uploadLog.backupData) {
      try {
        backup = JSON.parse(uploadLog.backupData) as UploadBackup
      } catch {
        backup = null
      }
    }

    let deletedCount = 0
    let restoredCount = 0

    await prisma.$transaction(async (tx) => {
      if (backup) {
        // ===== 快照精确回滚 =====
        for (const table of ['rawData', 'convData'] as const) {
          const tableBackup: TableBackup | undefined = backup[table]
          if (!tableBackup) continue
          const model = (tx as any)[table]

          if (tableBackup.insertedIds.length > 0) {
            const del = await model.deleteMany({ where: { id: { in: tableBackup.insertedIds } } })
            deletedCount += del.count
          }

          for (const row of tableBackup.updatedRows) {
            const rowId = row.id as number
            const stillExists = await model.findUnique({ where: { id: rowId }, select: { id: true } })
            if (!stillExists) continue // 行已被后续操作删除，跳过
            await model.update({ where: { id: rowId }, data: buildRestoreData(table, row) })
            restoredCount++
          }
        }
      } else {
        // ===== 旧记录（无快照）回退逻辑：只能删除带本 uploadLogId 的行 =====
        const delRaw = await tx.rawData.deleteMany({ where: { uploadLogId: id } })
        const delConv = await tx.convData.deleteMany({ where: { uploadLogId: id } })
        deletedCount = delRaw.count + delConv.count
      }

      await tx.uploadLog.update({
        where: { id },
        data: {
          rolledBackAt: new Date(),
          errorDetails: backup
            ? `已撤销：删除本次新增 ${deletedCount} 条，恢复被覆盖 ${restoredCount} 条`
            : `已撤销（旧格式记录，仅删除新增数据）：删除 ${deletedCount} 条`,
        },
      })
    }, { timeout: 60000, maxWait: 10000 })

    res.json({
      success: true,
      data: {
        deletedCount,
        restoredCount,
        message: backup
          ? `已撤销本次上传：删除新增数据 ${deletedCount} 条，恢复被覆盖数据 ${restoredCount} 条`
          : `已撤销本次上传：删除数据 ${deletedCount} 条（旧格式记录，无法恢复被覆盖的数据）`,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
