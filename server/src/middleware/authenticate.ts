import type { Request, Response, NextFunction } from 'express'
import { verifyToken, parsePermittedChannels } from '../utils/auth'
import { prisma } from '../lib/prisma'

/** 扩展 Express Request 类型 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        username: string
        role: string
        permittedChannels: string[] | null // null = admin 全权限
      }
    }
  }
}

/** 必须认证的中间件 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '未提供认证令牌' })
    return
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ success: false, message: '认证令牌无效或已过期' })
    return
  }

  // 异步查用户
  prisma.user.findUnique({ where: { id: payload.userId } })
    .then((user) => {
      if (!user) {
        res.status(401).json({ success: false, message: '用户不存在' })
        return
      }
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        permittedChannels: parsePermittedChannels(user.permittedChannels),
      }
      next()
    })
    .catch((err) => {
      next(err)
    })
}

/** 可选认证（不强制，有 token 则解析） */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    next()
    return
  }

  prisma.user.findUnique({ where: { id: payload.userId } })
    .then((user) => {
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          role: user.role,
          permittedChannels: parsePermittedChannels(user.permittedChannels),
        }
      }
      next()
    })
    .catch(() => next())
}
