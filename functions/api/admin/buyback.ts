/**
 * POST /api/admin/buyback — GM 回收装备（支付玩家积分）
 * Body: { user_id: number, item_name: string, amount: number, note?: string }
 */

import { requireAuth, requireGM } from '../../../../src/middleware/auth'
import { createDB } from '../../../../src/db/client'
import { TradeService } from '../../../../src/services/trade'

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const body: { user_id?: number; item_name?: string; amount?: number; note?: string } =
    await context.request.json().catch(() => ({}))

  if (!body.user_id || !body.item_name || !body.amount) {
    return Response.json(
      { success: false, error: '请指定用户 ID、装备名称和积分数量' },
      { status: 400 },
    )
  }
  if (body.amount <= 0) {
    return Response.json({ success: false, error: '积分必须大于 0' }, { status: 400 })
  }

  const db = createDB(context.env)
  const tradeService = new TradeService(db)

  const result = await tradeService.executeBuyback(
    body.user_id,
    auth.sub,
    body.item_name.trim(),
    body.amount,
    body.note,
  )

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 })
  }

  return Response.json({ success: true, data: result.transaction })
}
