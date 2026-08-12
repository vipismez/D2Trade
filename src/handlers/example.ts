/**
 * 示例 CRUD handler（后续替换为实际业务逻辑）
 */

import type { Env } from '../index'
import { jsonResponse, errorResponse } from '../utils/response'

// 临时内存存储（生产环境应使用 D1 / KV）
const store = new Map<string, { id: string; name: string }>()

export async function list(_req: Request, _env: Env): Promise<Response> {
  const items = Array.from(store.values())
  return jsonResponse({ data: items, total: items.length })
}

export async function get(req: Request, _env: Env): Promise<Response> {
  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()!
  const item = store.get(id)
  if (!item) return errorResponse(404, 'Item not found')
  return jsonResponse({ data: item })
}

export async function create(req: Request, _env: Env): Promise<Response> {
  const body: { id?: string; name?: string } = await req.json().catch(() => ({}))
  if (!body.id || !body.name) {
    return errorResponse(400, 'id and name are required')
  }
  const item = { id: body.id, name: body.name }
  store.set(item.id, item)
  return jsonResponse({ data: item }, 201)
}

export async function update(req: Request, _env: Env): Promise<Response> {
  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()!
  if (!store.has(id)) return errorResponse(404, 'Item not found')
  const body: { name?: string } = await req.json().catch(() => ({}))
  const item = store.get(id)!
  if (body.name) item.name = body.name
  return jsonResponse({ data: item })
}

export async function remove(req: Request, _env: Env): Promise<Response> {
  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()!
  if (!store.has(id)) return errorResponse(404, 'Item not found')
  store.delete(id)
  return jsonResponse({ success: true })
}
