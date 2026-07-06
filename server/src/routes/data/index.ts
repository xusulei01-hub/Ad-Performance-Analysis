import { Router } from 'express'
import uploadRoutes from './uploadRoutes'
import convUploadRoutes from './convUploadRoutes'
import mediaUploadRoutes from './mediaUploadRoutes'
import mappingRoutes from './mappingRoutes'
import recordRoutes from './recordRoutes'
import uploadLogRoutes from './uploadLogRoutes'

const router = Router()
// 旧版双文件上传（保留兼容）
router.use(uploadRoutes)
// 新版上传：转化表 + 按渠道媒体表
router.use(convUploadRoutes)
router.use(mediaUploadRoutes)
router.use(mappingRoutes)
router.use(recordRoutes)
router.use(uploadLogRoutes)

export default router
