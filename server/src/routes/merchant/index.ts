import { Router } from 'express'
import uploadRoutes from './uploadRoutes'
import recordRoutes from './recordRoutes'
import reportRoutes from './reportRoutes'
import mappingRoutes from './mappingRoutes'

const router = Router()
router.use(uploadRoutes)
router.use(recordRoutes)
router.use(reportRoutes)
router.use(mappingRoutes)

export default router
