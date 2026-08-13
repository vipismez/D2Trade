/**
 * POST /api/admin/buyback-requests/:id — GM 处理回收申请
 * Body: { action: 'approve' | 'reject', amount?: number, note?: string }
 * approve 时支付用户积分（默认按期望积分，可用 amount 覆盖）
 */

import { requireAuth, requireGM } from '../../../_lib/auth-middleware'
import { createDB } from '../../../_lib/db-client'
import { BuybackRequestDB } from '../../../_lib/db-buyback'
import { TradeService } from '../../../_lib/trade'

export async function onRequestPost(context: EventContext<Env, 'id', unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const id = parseInt(context.params.id)
  if (isNaN(id)) {
    return Response.json({ success: false, error: '无效的申请 ID' }, { status: 400 })
  }

  const body: { action?: string; amount?: number; note?: string } = await context.request
    .json()
    .catch(() => ({}))

  if (body.action !== 'approve' && body.action !== 'reject') {
    return Response.json({ success: false, error: '请指定处理方式（approve/reject）' }, { status: 400 })
  }

  const db = createDB(context.env)
  const requestsDB = new BuybackRequestDB(db)

  const request = await requestsDB.getById(id)
  if (!request) {
    return Response.json({ success: false, error: '申请不存在' }, { status: 404 })
  }
  if (request.status !== 'pending') {
    return Response.json({ success: false, error: '该申请已处理' }, { status: 400 })
  }

  const note = body.note?.trim() || ''

  if (body.action === 'reject') {
    const ok = await requestsDB.reject(id, auth.sub, note)
    if (!ok) {
      return Response.json({ success: false, error: '处理失败，请重试' }, { status: 500 })
    }
    return Response.json({ success: true, message: '已拒绝该申请' })
  }

  // 批准：确定支付金额（优先 GM 指定金额，否则按用户期望）
  const amount = body.amount && body.amount > 0 ? body.amount : request.expected_points
  if (amount <= 0) {
    return Response.json({ success: false, error: '支付积分必须大于 0' }, { status: 400 })
  }

  const tradeService = new TradeService(db)
  const result = await tradeService.executeBuyback(
    request.user_id,
    auth.sub,
    request.item_name,
    amount,
    note || `回收申请 #${id} 审批通过`,
  )

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 })
  }

  const ok = await requestsDB.approve(id, auth.sub, note || `支付 ${amount} 积分`)
  if (!ok) {
    // 积分已发放但状态更新失败，记录日志供 GM 人工核对
    console.error(`Buyback approve: payment done but status update failed for request #${id}`)
  }

  return Response.json({ success: true, data: result.transaction })
}
