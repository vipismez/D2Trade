/**
 * GET /api/admin/transactions — 全部交易记录（GM）
 */

import { requireAuth, requireGM } from '../../../../src/middleware/auth'
import { createDB } from '../../../../src/db/client'
import { TransactionDB } from '../../../../src/db/transactions'
import type { TransactionType } from '../../../../src/types'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const url = new URL(context.request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')))
  const type = (url.searchParams.get('type') as TransactionType) || undefined

  const db = createDB(context.env)
  const transactionsDB = new TransactionDB(db)
  const result = await transactionsDB.getAll(page, pageSize, type)

  return Response.json({
    success: true,
    data: result.items,
    total: result.total,
    page,
    pageSize,
  })
}
