/**
 * POST /api/admin/grant — GM 发放积分
 * Body: { user_id: number, amount: number, note?: string }
 */

import { requireAuth, requireGM } from '../../_lib/auth-middleware'
import { createDB } from '../../_lib/db-client'
import { TradeService } from '../../_lib/trade'

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const body: { user_id?: number; amount?: number; note?: string } = await context.request
    .json()
    .catch(() => ({}))
  if (!body.user_id || !body.amount) {
    return Response.json(
      { success: false, error: '请指定用户 ID 和积分数量' },
      { status: 400 },
    )
  }
  if (body.amount <= 0) {
    return Response.json({ success: false, error: '积分必须大于 0' }, { status: 400 })
  }

  const db = createDB(context.env)
  const tradeService = new TradeService(db)

  const result = await tradeService.grantPoints(body.user_id, auth.sub, body.amount, body.note)

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 })
  }

  return Response.json({ success: true, data: result.transaction })
}
