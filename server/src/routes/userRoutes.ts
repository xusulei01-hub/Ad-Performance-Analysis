import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../utils/auth'
import { requireAdmin } from '../middleware/authorize'

const router = Router()

// GET /api/v1/user/me — 获取当前用户信息
router.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, role: true, permittedChannels: true, createdAt: true },
    })
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' })
      return
    }
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/user/users — 列出所有用户（管理员）
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, permittedChannels: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ success: true, data: users })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/user/users — 创建用户（管理员）
router.post('/users', requireAdmin, async (req, res, next) => {
  try {
    const { username, password, role, permittedChannels } = req.body
    if (!username || !password) {
      res.status(400).json({ success: false, message: '用户名和密码为必填项' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { username: String(username).trim() } })
    if (existing) {
      res.status(409).json({ success: false, message: '用户名已存在' })
      return
    }

    const passwordHash = await hashPassword(String(password))
    const userRole = role === 'admin' ? 'admin' : 'channel_user'
    const channels = userRole === 'admin'
      ? null
      : (Array.isArray(permittedChannels) ? JSON.stringify(permittedChannels) : null)

    const user = await prisma.user.create({
      data: { username: String(username).trim(), passwordHash, role: userRole, permittedChannels: channels },
      select: { id: true, username: true, role: true, permittedChannels: true, createdAt: true },
    })

    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/user/users/:id — 修改用户（管理员）
router.put('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { username, password, role, permittedChannels } = req.body

    const data: any = {}
    if (username !== undefined) data.username = String(username).trim()
    if (password !== undefined && password !== '') {
      data.passwordHash = await hashPassword(String(password))
    }
    if (role !== undefined) {
      data.role = role === 'admin' ? 'admin' : 'channel_user'
      if (data.role === 'admin') {
        data.permittedChannels = null
      }
    }
    if (permittedChannels !== undefined && data.role !== 'admin') {
      data.permittedChannels = Array.isArray(permittedChannels) ? JSON.stringify(permittedChannels) : null
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, permittedChannels: true, createdAt: true },
    })

    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/user/users/:id — 删除用户（管理员）
router.delete('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)

    // 不能删除自己
    if (id === req.user!.id) {
      res.status(400).json({ success: false, message: '不能删除自己' })
      return
    }

    // 确保至少保留一个管理员
    const adminCount = await prisma.user.count({ where: { role: 'admin' } })
    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (targetUser?.role === 'admin' && adminCount <= 1) {
      res.status(400).json({ success: false, message: '不能删除最后一个管理员' })
      return
    }

    await prisma.user.delete({ where: { id } })
    res.json({ success: true, data: { message: '用户已删除' } })
  } catch (err) {
    next(err)
  }
})

export default router
