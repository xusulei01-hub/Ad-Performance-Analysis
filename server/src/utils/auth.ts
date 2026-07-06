import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const SALT_ROUNDS = 10
const JWT_SECRET = process.env.JWT_SECRET || 'epw-dev-secret-change-in-production'
const TOKEN_EXPIRY = '7d'

/** bcrypt 哈希密码 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/** 验证密码 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** 签发 JWT */
export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

/** 验证 JWT */
export function verifyToken(token: string): { userId: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
    return { userId: payload.userId }
  } catch {
    return null
  }
}

/**
 * 解析 permittedChannels JSON 字符串
 * - admin（channels 为 null）→ 返回 null 表示全权限
 * - channel_user → 返回 string[]
 */
export function parsePermittedChannels(channels: string | null): string[] | null {
  if (channels === null || channels === undefined) return null
  try {
    const parsed = JSON.parse(channels)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return []
  } catch {
    return []
  }
}
