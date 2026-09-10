import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import multer from 'multer'
import * as creativeService from '../services/creativeService'
import { CREATIVE_DIR } from '../services/creativeService'
import { verifyToken } from '../utils/auth'
import { authenticate } from '../middleware/authenticate'
import { MASTER_CHANNELS } from '../constants'
import { prisma } from '../lib/prisma'

const router = Router()

const TMP_DIR = path.join(CREATIVE_DIR, 'tmp')

const upload = multer({
  storage: multer.diskStorage({
    destination: TMP_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024, files: 20 },
})

/** 媒体文件鉴权：支持 Authorization 头或 ?token= 查询参数（<img>/<video> 标签无法带头） */
async function authenticateMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : String(req.query.token || '')
  if (!token) {
    res.status(401).json({ success: false, message: '未提供认证令牌' })
    return
  }
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ success: false, message: '认证令牌无效或已过期' })
    return
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    res.status(401).json({ success: false, message: '用户不存在' })
    return
  }
  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    permittedChannels: user.permittedChannels ? JSON.parse(user.permittedChannels) : null,
  }
  next()
}

// GET /api/v1/creatives/file/:storedName — 素材文件服务（仅上传者本人或管理员）
router.get('/file/:storedName', authenticateMedia, async (req, res, next) => {
  try {
    const storedName = path.basename(String(req.params.storedName)) // 防路径穿越
    const creative = await creativeService.findByStoredName(storedName)
    if (!creative) {
      res.status(404).json({ success: false, message: '文件不存在' })
      return
    }
    if (req.user?.role !== 'admin' && creative.userId !== req.user?.id) {
      res.status(403).json({ success: false, message: '无权访问该素材' })
      return
    }
    const filePath = path.join(CREATIVE_DIR, storedName)
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: '文件已被清理' })
      return
    }
    res.setHeader('Content-Type', creative.mimeType)
    res.setHeader('Cache-Control', 'private, max-age=86400')
    res.sendFile(filePath)
  } catch (err) {
    next(err)
  }
})

// === 以下接口统一走标准 Bearer 认证 ===
router.use(authenticate)

// POST /api/v1/creatives/upload — 上传素材（批量 + zip），字段：files[], channel, campaignId?, title?
router.post('/upload', upload.array('files', 20), async (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[]) || []
    const channel = String(req.body.channel || '').trim()
    const campaignId = String(req.body.campaignId || '').trim() || undefined
    const title = String(req.body.title || '').trim() || undefined

    if (files.length === 0) {
      res.status(400).json({ success: false, message: '请选择要上传的文件' })
      return
    }
    if (!channel) {
      for (const f of files) fs.unlink(f.path, () => {})
      res.status(400).json({ success: false, message: '请选择素材所属渠道' })
      return
    }
    // 渠道权限：非管理员只能上传到有权限的渠道
    if (req.user?.role !== 'admin' && !(req.user?.permittedChannels || []).includes(channel)) {
      for (const f of files) fs.unlink(f.path, () => {})
      res.status(403).json({ success: false, message: `没有渠道 ${channel} 的权限` })
      return
    }

    const results = await creativeService.processCreativeUploads(files, {
      userId: req.user!.id,
      channel,
      campaignId,
      title,
    })
    res.json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/creatives/list
router.get('/list', async (req, res, next) => {
  try {
    const data = await creativeService.listCreatives(req.user, {
      status: req.query.status ? String(req.query.status) : undefined,
      channel: req.query.channel ? String(req.query.channel) : undefined,
      campaignId: req.query.campaign_id ? String(req.query.campaign_id) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    })
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/creatives/pending-count — admin 审核角标
router.get('/pending-count', async (req, res, next) => {
  try {
    const count = await creativeService.countPending()
    res.json({ success: true, data: { count } })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/creatives/channels — 渠道主清单 ∪ 数据中实际出现的渠道（按用户权限过滤）
router.get('/channels', async (req, res, next) => {
  try {
    const [convChannels, rawChannels] = await Promise.all([
      prisma.convData.groupBy({ by: ['channel'], orderBy: { channel: 'asc' } }),
      prisma.rawData.groupBy({ by: ['channel'], orderBy: { channel: 'asc' } }),
    ])
    let all = Array.from(new Set([
      ...MASTER_CHANNELS,
      ...convChannels.map((r) => r.channel),
      ...rawChannels.map((r) => r.channel),
    ])).sort()
    // 非管理员只保留权限内渠道
    if (req.user?.role !== 'admin' && req.user?.permittedChannels !== null) {
      const allowed = req.user?.permittedChannels || []
      all = all.filter((c) => allowed.includes(c))
    }
    res.json({ success: true, data: all })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/creatives/:id/review — admin 审核
router.post('/:id/review', async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: '需要管理员权限' })
      return
    }
    const action = String(req.body.action || '')
    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ success: false, message: 'action 必须为 approve 或 reject' })
      return
    }
    const result = await creativeService.reviewCreative(req.user.username, Number(req.params.id), action, req.body.comment)
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message })
      return
    }
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/creatives/:id/resubmit — 驳回后重新提交
router.post('/:id/resubmit', async (req, res, next) => {
  try {
    const result = await creativeService.resubmitCreative(req.user!.id, Number(req.params.id))
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message })
      return
    }
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/creatives/:id/campaigns — 关联/修改计划（body: { campaignIds: string[] }）
router.put('/:id/campaigns', async (req, res, next) => {
  try {
    const campaignIds = Array.isArray(req.body.campaignIds) ? req.body.campaignIds : []
    const result = await creativeService.setCreativeCampaigns(req.user, Number(req.params.id), campaignIds)
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message })
      return
    }
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/creatives/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await creativeService.deleteCreative(req.user, Number(req.params.id))
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message })
      return
    }
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/creatives/:id/performance — 关联计划投放效果
router.get('/:id/performance', async (req, res, next) => {
  try {
    const result = await creativeService.getCreativePerformance(
      req.user,
      Number(req.params.id),
      req.query.start_date ? String(req.query.start_date) : undefined,
      req.query.end_date ? String(req.query.end_date) : undefined,
    )
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
