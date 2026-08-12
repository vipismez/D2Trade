/**
 * GET /api/listings/mine — 我的发布列表
 */

import { requireAuth } from '../../../src/middleware/auth'
import { ListingDB } from '../../../src/db/listings'
import { createDB } from '../../../src/db/client'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const db = createDB(context.env)
  const listingsDB = new ListingDB(db)

  const url = new URL(context.request.url)
  const status = url.searchParams.get('status') || undefined

  const items = await listingsDB.getBySeller(auth.sub, status)

  return Response.json({ success: true, data: items })
}
