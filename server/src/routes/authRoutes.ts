import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { hashPassword, comparePassword, signToken } from '../utils/auth'

const router = Router()

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ success: false, message: '请输入用户名和密码' })
      return
    }

    const user = await prisma.user.findUnique({ where: { username: String(username).trim() } })
    if (!user) {
      res.status(401).json({ success: false, message: '用户名或密码错误' })
      return
    }

    const valid = await comparePassword(String(password), user.passwordHash)
    if (!valid) {
      res.status(401).json({ success: false, message: '用户名或密码错误' })
      return
    }

    const token = signToken(user.id)

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          permittedChannels: user.permittedChannels,
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/auth/me — 获取当前用户信息（认证由 index.ts 层面的 authenticate 处理？
// 不，authRoutes 整个挂载在 /api/v1/auth 上且未经过 authenticate 中间件）
// 所以这个需要单独放——实际上 me 端点也需要 token。方案：把 me 放到 userRoutes 中。

export default router
