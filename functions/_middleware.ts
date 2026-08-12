/**
 * Pages Functions — 全局中间件
 * 处理 CORS 预检 + 安全头注入
 *
 * 认证在各 handler 中按需调用 requireAuth()
 */

// 环境类型（Pages Functions 中 context.env 的类型）
interface Env {
  DB: D1Database
  JWT_SECRET: string
  ENVIRONMENT: string
}

export async function onRequest(context: EventContext<Env, string, unknown>): Promise<Response> {
  // CORS 预检
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const response = await context.next()

  // 注入 CORS + 安全头
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
