/**
 * GET    /api/listings/:id — 查看装备详情
 * PUT    /api/listings/:id — 编辑装备（仅发布者）
 * DELETE /api/listings/:id — 下架装备（仅发布者）
 */

import { requireAuth } from '../../../src/middleware/auth'
import { ListingDB } from '../../../src/db/listings'
import { createDB } from '../../../src/db/client'

export async function onRequestGet(context: EventContext<Env, 'id', unknown>): Promise<Response> {
  const id = parseInt(context.params.id)
  if (isNaN(id)) {
    return Response.json({ success: false, error: '无效的装备 ID' }, { status: 400 })
  }

  const db = createDB(context.env)
  const listingsDB = new ListingDB(db)
  const listing = await listingsDB.getByIdWithSeller(id)

  if (!listing) {
    return Response.json({ success: false, error: '装备不存在' }, { status: 404 })
  }

  return Response.json({ success: true, data: listing })
}

export async function onRequestPut(context: EventContext<Env, 'id', unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const id = parseInt(context.params.id)
  if (isNaN(id)) {
    return Response.json({ success: false, error: '无效的装备 ID' }, { status: 400 })
  }

  const body: { item_name?: string; item_attrs?: string; price?: number } = await context.request
    .json()
    .catch(() => ({}))

  const db = createDB(context.env)
  const listingsDB = new ListingDB(db)

  const ok = await listingsDB.update(id, auth.sub, body)
  if (!ok) {
    return Response.json(
      { success: false, error: '编辑失败：装备不存在或已售出' },
      { status: 400 },
    )
  }

  const updated = await listingsDB.getById(id)
  return Response.json({ success: true, data: updated })
}

export async function onRequestDelete(context: EventContext<Env, 'id', unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const id = parseInt(context.params.id)
  if (isNaN(id)) {
    return Response.json({ success: false, error: '无效的装备 ID' }, { status: 400 })
  }

  const db = createDB(context.env)
  const listingsDB = new ListingDB(db)

  const ok = await listingsDB.cancel(id, auth.sub)
  if (!ok) {
    return Response.json(
      { success: false, error: '下架失败：装备不存在或已售出' },
      { status: 400 },
    )
  }

  return Response.json({ success: true, message: '已下架' })
}
