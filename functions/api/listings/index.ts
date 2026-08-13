/**
 * GET  /api/listings — 市场装备列表
 * POST /api/listings — 发布装备
 */

import { requireAuth } from '../../_lib/auth-middleware'
import { ListingDB } from '../../_lib/db-listings'
import { createDB } from '../../_lib/db-client'

/** 市场列表（公开，无需登录） */
export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const db = createDB(context.env)
  const listingsDB = new ListingDB(db)

  const url = new URL(context.request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')))
  const search = url.searchParams.get('search') || undefined

  const result = await listingsDB.getMarketList(page, pageSize, search)

  return Response.json({
    success: true,
    data: result.items,
    total: result.total,
    page,
    pageSize,
  })
}

/** 发布装备（需登录） */
export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const body: { item_name?: string; item_attrs?: string; image_url?: string; price?: number } = await context.request
    .json()
    .catch(() => ({}))

  if (!body.item_name || !body.price) {
    return Response.json(
      { success: false, error: '装备名称和价格为必填项' },
      { status: 400 },
    )
  }
  if (body.price <= 0) {
    return Response.json(
      { success: false, error: '价格必须大于 0' },
      { status: 400 },
    )
  }

  const db = createDB(context.env)
  const listingsDB = new ListingDB(db)

  const listing = await listingsDB.create(auth.sub, {
    item_name: body.item_name.trim(),
    item_attrs: body.item_attrs ?? '{}',
    image_url: body.image_url ?? undefined,
    price: body.price,
  })

  if (!listing) {
    return Response.json(
      { success: false, error: '发布失败，请重试' },
      { status: 500 },
    )
  }

  return Response.json({ success: true, data: listing }, { status: 201 })
}
