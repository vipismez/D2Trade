/**
 * POST /api/auth/login — 用户登录
 * Body: { username, password }
 */

import { verifyPassword } from '../../src/utils/auth'
import { createAccessToken } from '../../src/utils/jwt'
import { UserDB } from '../../src/db/users'
import { createDB } from '../../src/db/client'

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const body: { username?: string; password?: string } = await context.request
    .json()
    .catch(() => ({}))

  if (!body.username || !body.password) {
    return Response.json(
      { success: false, error: '请输入用户名和密码' },
      { status: 400 },
    )
  }

  const db = createDB(context.env)
  const users = new UserDB(db)

  const user = await users.getByUsername(body.username.trim())
  if (!user) {
    return Response.json(
      { success: false, error: '用户名或密码错误' },
      { status: 401 },
    )
  }

  if (user.status === 'pending') {
    return Response.json(
      { success: false, error: '账号正在等待审批，请联系 GM' },
      { status: 403 },
    )
  }
  if (user.status === 'rejected') {
    return Response.json(
      { success: false, error: '账号审批未通过' },
      { status: 403 },
    )
  }

  const valid = await verifyPassword(body.password, user.password_hash)
  if (!valid) {
    return Response.json(
      { success: false, error: '用户名或密码错误' },
      { status: 401 },
    )
  }

  const token = await createAccessToken(
    { id: user.id, username: user.username, role: user.role },
    context.env.JWT_SECRET,
  )

  return Response.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        qq: user.qq,
        role: user.role,
        points: user.points,
      },
    },
  })
}
