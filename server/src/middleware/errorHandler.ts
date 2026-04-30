import type { Request, Response, NextFunction } from 'express'

/**
 * 统一错误处理中间件
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err)

  // Prisma 已知错误
  if (err.code?.startsWith('P')) {
    const message = err.meta?.cause
      ? `${err.message} (${err.meta.cause})`
      : err.message
    res.status(400).json({
      success: false,
      message,
      code: err.code,
      timestamp: new Date().toISOString(),
    })
    return
  }

  // Multer 文件错误
  if (err.message?.includes('仅支持') || err.message?.includes('file too large')) {
    res.status(400).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    })
    return
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  })
}
