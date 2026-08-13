/**
 * POST /api/transactions/buy — 购买装备
 * Body: { listing_id: number }
 */

import { requireAuth } from '../../_lib/auth-middleware'
import { createDB } from '../../_lib/db-client'
import { TradeService } from '../../_lib/trade'

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const body: { listing_id?: number } = await context.request.json().catch(() => ({}))
  if (!body.listing_id) {
    return Response.json({ success: false, error: '请指定装备 ID' }, { status: 400 })
  }

  const db = createDB(context.env)
  const tradeService = new TradeService(db)

  const result = await tradeService.executeTrade(body.listing_id, auth.sub)

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 })
  }

  return Response.json({ success: true, data: result.transaction })
}
