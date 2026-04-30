import { Router } from 'express'
import { createMulterUpload } from '../../utils/upload'
import * as merchantService from '../../services/merchantService'

const router = Router()
const upload = createMulterUpload()

// POST /api/v1/merchants/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ success: false, message: '需要上传文件' })
      return
    }

    const result = await merchantService.processMerchantUpload(file)
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message })
      return
    }

    res.json({ success: true, data: result.data })
  } catch (err) {
    next(err)
  }
})

export default router
