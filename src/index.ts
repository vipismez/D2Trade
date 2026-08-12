/**
 * D2Trade - Cloudflare Workers 入口
 *
 * 路由分发：API 请求 → Router，静态资源 → Pages
 */

import { router } from './router'
import { corsHeaders, errorResponse } from './utils/response'

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    try {
      const url = new URL(request.url)

      // API 路由
      if (url.pathname.startsWith('/api/')) {
        return router.handle(request, env, ctx)
      }

      // 否则交给 Pages 静态资源处理
      return env.ASSETS.fetch(request)
    } catch (err) {
      console.error('Unhandled error:', err)
      return errorResponse(500, 'Internal Server Error')
    }
  },
}

// ── 环境类型定义 ──

export interface Env {
  // Cloudflare Bindings
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  DB: D1Database
  // MY_KV: KVNamespace
  // MY_BUCKET: R2Bucket

  // 环境变量
  JWT_SECRET: string
  ENVIRONMENT: string
}
