/**
 * 统一响应工具
 */

export function corsHeaders(extra?: Record<string, string>): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    ...extra,
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  })
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: true, message }, status)
}

export function notFoundResponse(): Response {
  return errorResponse(404, 'Not Found')
}
