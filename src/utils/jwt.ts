/**
 * JWT 编解码 — 纯 Web Crypto API 实现
 *
 * 参照 RFC 7519，使用 HMAC-SHA256 (HS256)
 */

import type { JwtPayload } from '../types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Base64URL 编码 */
function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Base64URL 解码 */
function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** 获取 HMAC 密钥 */
async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** 签名 JWT */
export async function signToken(payload: JwtPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)))
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)))
  const message = `${headerB64}.${payloadB64}`

  const key = await getKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  const sigB64 = base64url(signature)

  return `${message}.${sigB64}`
}

/** 验证 JWT 并返回 payload */
export async function verifyToken(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, sigB64] = parts
    const message = `${headerB64}.${payloadB64}`

    // 验证签名
    const key = await getKey(secret)
    const sigBytes = base64urlDecode(sigB64)
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(message))
    if (!valid) return null

    // 解析 payload
    const payloadBytes = base64urlDecode(payloadB64)
    const payload: JwtPayload = JSON.parse(decoder.decode(payloadBytes))

    // 检查过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/** 签发 access token（默认 7 天过期） */
export async function createAccessToken(
  user: { id: number; username: string; role: string },
  secret: string,
  ttlSeconds = 7 * 24 * 3600,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return signToken(
    {
      sub: user.id,
      username: user.username,
      role: user.role as JwtPayload['role'],
      iat: now,
      exp: now + ttlSeconds,
    },
    secret,
  )
}
