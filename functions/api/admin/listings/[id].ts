/**
 * DELETE /api/admin/listings/:id — GM 下架物品
 */

import { requireAuth, requireGM } from '../../../_lib/auth-middleware'
import { createDB } from '../../../_lib/db-client'
import { ListingDB } from '../../../_lib/db-listings'

export async function onRequestDelete(context: EventContext<Env, 'id', unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const id = parseInt(context.params.id)
  if (isNaN(id)) {
    return Response.json({ success: false, error: '无效的物品 ID' }, { status: 400 })
  }

  const db = createDB(context.env)
  const listingsDB = new ListingDB(db)

  const ok = await listingsDB.cancelByAdmin(id)
  if (!ok) {
    return Response.json({ success: false, error: '下架失败：物品不存在或已下架' }, { status: 400 })
  }

  return Response.json({ success: true, message: '已下架' })
}
