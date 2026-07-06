import { Router } from 'express'
import uploadRoutes from './uploadRoutes'
import recordRoutes from './recordRoutes'
import reportRoutes from './reportRoutes'
import mappingRoutes from './mappingRoutes'
import { requireAdmin } from '../../middleware/authorize'

const router = Router()
// 期商模块仅管理员可访问
router.use(requireAdmin)
router.use(uploadRoutes)
router.use(recordRoutes)
router.use(reportRoutes)
router.use(mappingRoutes)

export default router
