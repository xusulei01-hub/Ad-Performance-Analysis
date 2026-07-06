import type { Request, Response, NextFunction } from 'express'

/** 仅管理员可访问 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: '需要管理员权限' })
    return
  }
  next()
}

/**
 * 渠道过滤：取用户请求的渠道和权限渠道的交集
 * 返回过滤后的渠道列表（空数组表示无可用渠道）
 */
export function resolveUserChannels(req: Request, requestedChannels?: string[]): string[] | null {
  // admin 全权限
  if (req.user?.role === 'admin' || req.user?.permittedChannels === null) {
    if (requestedChannels && requestedChannels.length > 0) return requestedChannels
    return null // null = 不过滤，查全表
  }

  const userChannels = req.user?.permittedChannels || []

  if (requestedChannels && requestedChannels.length > 0) {
    // 用户指定了渠道：取交集
    const intersected = requestedChannels.filter((c) => userChannels.includes(c))
    return intersected.length > 0 ? intersected : []
  }

  // 用户未指定渠道：限定为权限渠道
  return userChannels
}

/** 校验用户是否有特定渠道的上传/写入权限 */
export function requireChannelPermission(channel: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未认证' })
      return
    }
    if (req.user.role === 'admin' || req.user.permittedChannels === null) {
      next()
      return
    }
    const userChannels = req.user.permittedChannels || []
    if (!userChannels.includes(channel)) {
      res.status(403).json({ success: false, message: `没有渠道 ${channel} 的权限` })
      return
    }
    next()
  }
}
