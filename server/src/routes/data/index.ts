import { Router } from 'express'
import uploadRoutes from './uploadRoutes'
import mappingRoutes from './mappingRoutes'
import recordRoutes from './recordRoutes'
import uploadLogRoutes from './uploadLogRoutes'

const router = Router()
router.use(uploadRoutes)
router.use(mappingRoutes)
router.use(recordRoutes)
router.use(uploadLogRoutes)

export default router
