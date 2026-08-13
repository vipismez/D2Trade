/**
 * GET /api/transactions — 我的交易记录
 */

import { requireAuth } from '../../_lib/auth-middleware'
import { createDB } from '../../_lib/db-client'
import { TransactionDB } from '../../_lib/db-transactions'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const url = new URL(context.request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')))

  const db = createDB(context.env)
  const transactionsDB = new TransactionDB(db)

  const result = await transactionsDB.getByUser(auth.sub, page, pageSize)

  return Response.json({
    success: true,
    data: result.items,
    total: result.total,
    page,
    pageSize,
  })
}
