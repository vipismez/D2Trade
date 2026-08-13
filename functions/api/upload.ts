/**
 * POST /api/upload — 上传装备图片
 * Body: { filename: string, data: string(base64) }
 * 图片存入 R2，返回相对路径 /api/image/{key}
 */

import { requireAuth } from '../_lib/auth-middleware'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const auth = await requireAuth(context.request, context.env)
  if (auth instanceof Response) return auth

  const body: { filename?: string; data?: string } = await context.request
    .json()
    .catch(() => ({}))

  if (!body.data || !body.filename) {
    return Response.json({ success: false, error: '缺少图片数据' }, { status: 400 })
  }

  // 解析 base64（支持 data:image/xxx;base64, 前缀）
  const base64 = body.data.replace(/^data:image\/\w+;base64,/, '')
  let bytes: Uint8Array
  try {
    const bin = atob(base64)
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } catch {
    return Response.json({ success: false, error: '图片数据无效' }, { status: 400 })
  }

  if (bytes.length > MAX_SIZE) {
    return Response.json({ success: false, error: '图片不能超过 5MB' }, { status: 400 })
  }

  // 检测 MIME 类型（通过文件头魔数）
  const mime = detectMimeType(bytes)
  if (!mime || !ALLOWED_TYPES[mime]) {
    return Response.json(
      { success: false, error: '仅支持 JPG/PNG/WebP/GIF 格式' },
      { status: 400 },
    )
  }

  // 生成唯一 key
  const ext = ALLOWED_TYPES[mime]
  const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`

  await context.env.MY_BUCKET.put(key, bytes, {
    httpMetadata: { contentType: mime },
  })

  return Response.json({
    success: true,
    url: `/api/image/${key}`,
  })
}

/** 通过文件头魔数检测图片类型 */
function detectMimeType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif'
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  return null
}
