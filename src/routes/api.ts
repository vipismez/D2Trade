/**
 * API v1 路由注册
 */

import type { Router } from '../router'
import * as healthHandler from '../handlers/health'
import * as exampleHandler from '../handlers/example'

export function apiV1Routes(router: Router): void {
  // ── 健康检查 ──
  router.get('/api/v1/health', healthHandler.check)

  // ── 示例 CRUD ──
  router.get('/api/v1/items', exampleHandler.list)
  router.get('/api/v1/items/:id', exampleHandler.get)
  router.post('/api/v1/items', exampleHandler.create)
  router.put('/api/v1/items/:id', exampleHandler.update)
  router.delete('/api/v1/items/:id', exampleHandler.remove)
}
