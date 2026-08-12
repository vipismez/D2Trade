/**
 * 健康检查 handler
 */

import type { Env } from '../index'
import { jsonResponse } from '../utils/response'

export async function check(_req: Request, env: Env): Promise<Response> {
  return jsonResponse({
    status: 'ok',
    environment: env.ENVIRONMENT,
    timestamp: Date.now(),
  })
}
