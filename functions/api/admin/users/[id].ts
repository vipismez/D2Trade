/**
 * PUT    /api/admin/users/:id — GM 编辑用户
 * DELETE /api/admin/users/:id — GM 禁用用户（软删除，历史数据保留）
 */

import { requireAuth, requireGM } from '../../../_lib/auth-middleware'
import { createDB } from '../../../_lib/db-client'
import { UserDB } from '../../../_lib/db-users'
import { hashPassword } from '../../../_lib/auth'

export async function onRequestPut(context: EventContext<Env, 'id', unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const id = parseInt(context.params.id)
  if (isNaN(id)) {
    return Response.json({ success: false, error: '无效的用户 ID' }, { status: 400 })
  }

  const body: {
    username?: string
    qq?: string
    role?: string
    status?: string
    points?: number
    password?: string
    is_banned?: boolean
  } = await context.request.json().catch(() => ({}))

  const fields: {
    username?: string
    qq?: string
    role?: 'player' | 'gm'
    status?: 'pending' | 'approved' | 'rejected'
    points?: number
    password_hash?: string
    is_banned?: number
  } = {}

  if (body.username !== undefined && body.username.trim() !== '') {
    const username = body.username.trim()
    if (username.length < 3 || username.length > 20) {
      return Response.json({ success: false, error: '用户名需 3-20 个字符' }, { status: 400 })
    }
    fields.username = username
  }
  if (body.qq !== undefined) fields.qq = body.qq.trim()
  if (body.role !== undefined) fields.role = body.role === 'gm' ? 'gm' : 'player'
  if (body.status !== undefined && ['pending', 'approved', 'rejected'].includes(body.status)) {
    fields.status = body.status as 'pending' | 'approved' | 'rejected'
  }
  if (body.points !== undefined) fields.points = Math.max(0, parseInt(String(body.points)) || 0)
  if (body.is_banned !== undefined) fields.is_banned = body.is_banned ? 1 : 0
  if (body.password !== undefined && body.password !== '') {
    if (body.password.length < 6) {
      return Response.json({ success: false, error: '密码至少 6 位' }, { status: 400 })
    }
    fields.password_hash = await hashPassword(body.password)
  }

  // 保护：不能把自己降级或禁用
  if (id === auth.sub) {
    if (fields.role === 'player') {
      return Response.json({ success: false, error: '不能取消自己的 GM 权限' }, { status: 400 })
    }
    if (fields.is_banned === 1) {
      return Response.json({ success: false, error: '不能禁用自己的账号' }, { status: 400 })
    }
  }

  const db = createDB(context.env)
  const usersDB = new UserDB(db)

  const ok = await usersDB.updateProfile(id, fields)
  if (!ok) {
    return Response.json({ success: false, error: '编辑失败：用户不存在' }, { status: 400 })
  }

  const updated = await usersDB.getPublicById(id)
  return Response.json({ success: true, data: updated })
}

export async function onRequestDelete(context: EventContext<Env, 'id', unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const id = parseInt(context.params.id)
  if (isNaN(id)) {
    return Response.json({ success: false, error: '无效的用户 ID' }, { status: 400 })
  }

  if (id === auth.sub) {
    return Response.json({ success: false, error: '不能禁用自己的账号' }, { status: 400 })
  }

  const db = createDB(context.env)
  const usersDB = new UserDB(db)

  const ok = await usersDB.setBanned(id, true)
  if (!ok) {
    return Response.json({ success: false, error: '禁用失败：用户不存在' }, { status: 400 })
  }

  return Response.json({ success: true, message: '已禁用该用户' })
}
