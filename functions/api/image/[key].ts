/**
 * GET /api/image/:key — 读取装备图片（从 R2）
 */

export async function onRequestGet(context: EventContext<Env, 'key', unknown>): Promise<Response> {
  const key = context.params.key

  // 防止路径穿越
  if (!key || key.includes('..') || key.includes('/')) {
    return new Response('Invalid key', { status: 400 })
  }

  const object = await context.env.MY_BUCKET.get(key)
  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
}
