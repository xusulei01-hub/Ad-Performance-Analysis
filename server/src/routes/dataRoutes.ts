import { Router } from 'express'

const router = Router()

// POST /api/v1/data/upload - 上传Excel文件
router.post('/upload', (req, res) => {
  res.json({ success: true, message: 'Upload endpoint - TODO' })
})

// GET /api/v1/data/records - 查询原始数据列表
router.get('/records', (req, res) => {
  res.json({ success: true, message: 'Records endpoint - TODO' })
})

// GET /api/v1/data/channels - 获取所有渠道列表
router.get('/channels', (req, res) => {
  res.json({ success: true, message: 'Channels endpoint - TODO' })
})

// GET /api/v1/data/upload-logs - 获取上传历史
router.get('/upload-logs', (req, res) => {
  res.json({ success: true, message: 'Upload logs endpoint - TODO' })
})

export default router
