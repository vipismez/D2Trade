/**
 * GET /api/auth/me — 获取当前登录用户信息
 */

import { requireAuth } from '../../../src/middleware/auth'
import { UserDB } from '../../../src/db/users'
import { createDB } from '../../../src/db/client'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const db = createDB(context.env)
  const users = new UserDB(db)
  const user = await users.getPublicById(auth.sub)
  if (!user) {
    return Response.json({ success: false, error: '用户不存在' }, { status: 404 })
  }

  return Response.json({ success: true, data: user })
}
