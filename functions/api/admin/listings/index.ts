/**
 * GET /api/admin/listings — GM 查看所有物品
 * Query: status=active|cancelled|sold, search, seller, page, pageSize
 */

import { requireAuth, requireGM } from '../../../_lib/auth-middleware'
import { createDB } from '../../../_lib/db-client'
import { ListingDB } from '../../../_lib/db-listings'

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const gmCheck = requireGM(auth)
  if (gmCheck) return gmCheck

  const url = new URL(context.request.url)
  const status = url.searchParams.get('status') || undefined
  const search = url.searchParams.get('search') || undefined
  const seller = url.searchParams.get('seller') || undefined
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')))

  const db = createDB(context.env)
  const listingsDB = new ListingDB(db)
  const result = await listingsDB.getAllWithSeller({
    status: status === 'active' || status === 'cancelled' || status === 'sold' ? status : undefined,
    search,
    seller,
    page,
    pageSize,
  })

  return Response.json({
    success: true,
    data: result.items,
    total: result.total,
    page,
    pageSize,
  })
}

