/**
 * GET /api/admin/users/pending — 待审批用户列表（GM）
 */

import { requireAuth, requireGM } from '../../../../src/middleware/auth'
import { createDB } from '../../../../src/db/client'
import { UserDB } from '../../../../src/db/users'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const db = createDB(context.env)
  const usersDB = new UserDB(db)
  const users = await usersDB.getPending()

  return Response.json({ success: true, data: users })
}
