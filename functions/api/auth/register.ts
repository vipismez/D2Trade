/**
 * POST /api/auth/register — 用户注册
 * Body: { username, password, qq }
 */

import { hashPassword } from '../../_lib/auth'
import { createAccessToken } from '../../_lib/jwt'
import { UserDB } from '../../_lib/db-users'
import { createDB } from '../../_lib/db-client'

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const body: { username?: string; password?: string; qq?: string } = await context.request
    .json()
    .catch(() => ({}))

  // 参数校验
  if (!body.username || !body.password || !body.qq) {
    return Response.json(
      { success: false, error: '用户名、密码、QQ 为必填项' },
      { status: 400 },
    )
  }

  const username = body.username.trim()
  if (username.length < 3 || username.length > 20) {
    return Response.json(
      { success: false, error: '用户名需 3-20 个字符' },
      { status: 400 },
    )
  }
  if (body.password.length < 6) {
    return Response.json(
      { success: false, error: '密码至少 6 位' },
      { status: 400 },
    )
  }

  const db = createDB(context.env)
  const users = new UserDB(db)

  // 检查用户名是否已存在
  const existing = await users.getByUsername(username)
  if (existing) {
    return Response.json(
      { success: false, error: '用户名已被注册' },
      { status: 409 },
    )
  }

  // 创建用户
  const passwordHash = await hashPassword(body.password)
  const user = await users.create(username, passwordHash, body.qq.trim())
  if (!user) {
    return Response.json(
      { success: false, error: '注册失败，请重试' },
      { status: 500 },
    )
  }

  return Response.json({
    success: true,
    message: '注册成功，请等待 GM 审批',
    data: {
      id: user.id,
      username: user.username,
      status: user.status,
    },
  })
}
