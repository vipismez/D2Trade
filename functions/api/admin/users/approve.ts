/**
 * PUT /api/admin/users/approve — 审批通过用户（GM）
 * Body: { user_id: number }
 */

import { requireAuth, requireGM } from '../../../../src/middleware/auth'
import { createDB } from '../../../../src/db/client'
import { UserDB } from '../../../../src/db/users'

export async function onRequestPut(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const body: { user_id?: number } = await context.request.json().catch(() => ({}))
  if (!body.user_id) {
    return Response.json({ success: false, error: '请指定用户 ID' }, { status: 400 })
  }

  const db = createDB(context.env)
  const usersDB = new UserDB(db)
  const ok = await usersDB.approve(body.user_id, auth.sub)

  if (!ok) {
    return Response.json(
      { success: false, error: '审批失败：用户不存在或已处理' },
      { status: 400 },
    )
  }

  return Response.json({ success: true, message: '已审批通过' })
}
