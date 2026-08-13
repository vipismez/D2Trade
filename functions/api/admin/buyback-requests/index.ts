/**
 * GET /api/admin/buyback-requests — 回收申请列表（GM）
 * Query: status=pending|approved|rejected
 */

import { requireAuth, requireGM } from '../../../_lib/auth-middleware'
import { createDB } from '../../../_lib/db-client'
import { BuybackRequestDB } from '../../../_lib/db-buyback'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const url = new URL(context.request.url)
  const status = url.searchParams.get('status') || undefined

  const db = createDB(context.env)
  const requestsDB = new BuybackRequestDB(db)
  const requests = await requestsDB.getAll(
    status === 'pending' || status === 'approved' || status === 'rejected' ? status : undefined,
  )

  return Response.json({ success: true, data: requests })
}
