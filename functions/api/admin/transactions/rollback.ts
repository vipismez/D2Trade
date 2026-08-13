/**
 * POST /api/admin/transactions/rollback — 回退交易（GM）
 * Body: { transaction_id: number, reason: string }
 */

import { requireAuth, requireGM } from '../../../_lib/auth-middleware'
import { createDB } from '../../../_lib/db-client'
import { TradeService } from '../../../_lib/trade'

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const body: { transaction_id?: number; reason?: string } = await context.request
    .json()
    .catch(() => ({}))
  if (!body.transaction_id) {
    return Response.json({ success: false, error: '请指定交易 ID' }, { status: 400 })
  }
  if (!body.reason) {
    return Response.json({ success: false, error: '请填写回退原因' }, { status: 400 })
  }

  const db = createDB(context.env)
  const tradeService = new TradeService(db)

  const result = await tradeService.executeRollback(body.transaction_id, auth.sub, body.reason)

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 })
  }

  return Response.json({ success: true, message: '交易已回退' })
}
