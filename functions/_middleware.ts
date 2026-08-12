/**
 * Pages Functions — API 中间件
 *
 * 放在 /functions/api/ 目录下即可通过 /api/* 路径访问
 * 如需 Workers 完整路由能力，可使用 src/index.ts 中的 Worker
 */

export async function onRequest(context: EventContext<Env, string, unknown>): Promise<Response> {
  // 示例：统一添加安全头
  const response = await context.next()
  const newHeaders = new Headers(response.headers)
  newHeaders.set('X-Content-Type-Options', 'nosniff')
  newHeaders.set('X-Frame-Options', 'DENY')

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  })
}
