/**
 * 简易路由 — 按 HTTP 方法 + 路径分发请求
 */

import type { Env } from './index'
import { apiV1Routes } from './routes/api'
import { notFoundResponse } from './utils/response'

type Handler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) => Promise<Response> | Response

interface Route {
  method: string
  pattern: URLPattern
  handler: Handler
}

class Router {
  private routes: Route[] = []

  /** 注册路由 */
  add(method: string, pathname: string, handler: Handler): void {
    this.routes.push({
      method: method.toUpperCase(),
      pattern: new URLPattern({ pathname }),
      handler,
    })
  }

  get(pathname: string, handler: Handler) {
    this.add('GET', pathname, handler)
  }
  post(pathname: string, handler: Handler) {
    this.add('POST', pathname, handler)
  }
  put(pathname: string, handler: Handler) {
    this.add('PUT', pathname, handler)
  }
  delete(pathname: string, handler: Handler) {
    this.add('DELETE', pathname, handler)
  }

  /** 匹配并执行 */
  async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    for (const route of this.routes) {
      if (route.method !== request.method) continue
      const match = route.pattern.exec(url)
      if (match) {
        return route.handler(request, env, ctx)
      }
    }

    return notFoundResponse()
  }
}

export const router = new Router()

// 注册 v1 API 路由
apiV1Routes(router)
