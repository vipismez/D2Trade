/**
 * GET /api/hello — Pages Functions 示例端点
 */
export async function onRequestGet(): Promise<Response> {
  return new Response(
    JSON.stringify({ message: 'Hello from Pages Functions!', time: Date.now() }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
