/**
 * GET  /api/admin/users — 全部用户信息（GM）
 * POST /api/admin/users — GM 手动创建用户
 */

import { requireAuth, requireGM } from '../../../_lib/auth-middleware'
import { createDB } from '../../../_lib/db-client'
import { UserDB } from '../../../_lib/db-users'
import { hashPassword } from '../../../_lib/auth'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const db = createDB(context.env)
  const usersDB = new UserDB(db)
  const users = await usersDB.getAll()

  return Response.json({ success: true, data: users })
}

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const body: { username?: string; password?: string; qq?: string; role?: 'player' | 'gm' } =
    await context.request.json().catch(() => ({}))

  if (!body.username || !body.password || !body.qq) {
    return Response.json({ success: false, error: '用户名、密码、QQ 为必填项' }, { status: 400 })
  }

  const username = body.username.trim()
  if (username.length < 3 || username.length > 20) {
    return Response.json({ success: false, error: '用户名需 3-20 个字符' }, { status: 400 })
  }
  if (body.password.length < 6) {
    return Response.json({ success: false, error: '密码至少 6 位' }, { status: 400 })
  }
  const role = body.role === 'gm' ? 'gm' : 'player'

  const db = createDB(context.env)
  const usersDB = new UserDB(db)

  const existing = await usersDB.getByUsername(username)
  if (existing) {
    return Response.json({ success: false, error: '用户名已被注册' }, { status: 409 })
  }

  const passwordHash = await hashPassword(body.password)
  const user = await usersDB.createByAdmin(username, passwordHash, body.qq.trim(), role)
  if (!user) {
    return Response.json({ success: false, error: '创建失败，请重试' }, { status: 500 })
  }

  return Response.json({
    success: true,
    message: '用户创建成功',
    data: { id: user.id, username: user.username, role: user.role, status: user.status },
  })
}

