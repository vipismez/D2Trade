/**
 * GET  /api/buyback — 查看我的回收申请（需登录）
 * POST /api/buyback — 提交回收申请（需登录）
 */

import { requireAuth } from '../../_lib/auth-middleware'
import { createDB } from '../../_lib/db-client'
import { BuybackRequestDB } from '../../_lib/db-buyback'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const db = createDB(context.env)
  const requestsDB = new BuybackRequestDB(db)
  const requests = await requestsDB.getByUser(auth.sub)

  return Response.json({ success: true, data: requests })
}

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const body: {
    item_name?: string
    item_attrs?: string
    image_url?: string
    expected_points?: number
  } = await context.request.json().catch(() => ({}))

  if (!body.item_name) {
    return Response.json({ success: false, error: '请填写装备名称' }, { status: 400 })
  }

  const db = createDB(context.env)
  const requestsDB = new BuybackRequestDB(db)

  const request = await requestsDB.create({
    userId: auth.sub,
    item_name: body.item_name.trim(),
    item_attrs: body.item_attrs ?? '{}',
    image_url: body.image_url ?? null,
    expected_points: Math.max(0, parseInt(String(body.expected_points ?? 0)) || 0),
  })

  if (!request) {
    return Response.json({ success: false, error: '提交失败，请重试' }, { status: 500 })
  }

  return Response.json({ success: true, data: request }, { status: 201 })
}
