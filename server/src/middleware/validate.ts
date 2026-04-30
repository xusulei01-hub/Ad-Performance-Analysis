import type { Request, Response, NextFunction } from 'express'

/**
 * 校验请求体中必须包含的字段
 */
export function requireFields(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter((f) => {
      const v = req.body[f]
      return v === undefined || v === null || v === ''
    })
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        message: `缺少必填字段: ${missing.join(', ')}`,
      })
      return
    }
    next()
  }
}

/**
 * 校验请求体中字段值必须在允许的枚举值中
 */
export function requireEnum(field: string, allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[field] || req.query[field]
    if (value && !allowed.includes(value)) {
      res.status(400).json({
        success: false,
        message: `${field} 必须是以下值之一: ${allowed.join(', ')}`,
      })
      return
    }
    next()
  }
}
