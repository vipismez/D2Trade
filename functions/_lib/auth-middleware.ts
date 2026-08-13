/**
 * 认证中间件 — 用于 Pages Functions
 *
 * 用法：
 *   import { requireAuth, requireGM } from '../src/middleware/auth'
 *   const user = await requireAuth(context)
 *   await requireGM(user)
 */

import { verifyToken } from './jwt'
import type { JwtPayload } from './types'

/** 从请求中提取 Bearer Token */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

/** 验证 JWT 并返回 payload，失败则返回 Response */
export async function requireAuth(
  request: Request,
  env: { JWT_SECRET: string },
): Promise<JwtPayload | Response> {
  const token = extractToken(request)
  if (!token) {
    return jsonError(401, '请先登录')
  }
  const payload = await verifyToken(token, env.JWT_SECRET)
  if (!payload) {
    return jsonError(401, '登录已过期，请重新登录')
  }
  return payload
}

/** 验证 GM 权限，非 GM 返回 403 */
export function requireGM(user: JwtPayload): Response | null {
  if (user.role !== 'gm') {
    return jsonError(403, '需要 GM 权限')
  }
  return null
}

/** 返回 JSON 错误响应 */
export function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
