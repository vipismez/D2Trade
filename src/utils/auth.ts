/**
 * 密码哈希 & 认证工具
 * PBKDF2（Web Crypto API 原生实现）
 */

const encoder = new TextEncoder()

/** 密码哈希配置 */
const PBKDF2_CONFIG = {
  iterations: 100_000,
  keyLength: 256, // bits
  hash: 'SHA-256' as const,
  saltLength: 16, // bytes
}

/**
 * 对密码进行 PBKDF2 哈希
 * 返回格式：salt:hash（均为 hex）
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_CONFIG.saltLength))
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_CONFIG.iterations,
      hash: PBKDF2_CONFIG.hash,
    },
    key,
    PBKDF2_CONFIG.keyLength,
  )

  return `${bytesToHex(salt)}:${bytesToHex(new Uint8Array(hash))}`
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false

  const salt = hexToBytes(saltHex)
  const expectedHash = hexToBytes(hashHex)

  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const actualHash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_CONFIG.iterations,
      hash: PBKDF2_CONFIG.hash,
    },
    key,
    PBKDF2_CONFIG.keyLength,
  )

  return timingSafeEqual(new Uint8Array(actualHash), expectedHash)
}

// ── 工具函数 ──

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/** 常量时间比较，防止时序攻击 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}
