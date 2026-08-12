/**
 * Users 表 CRUD 操作
 */

import type { DBClient } from './client'
import type { User, UserPublic } from '../types'

export class UserDB {
  constructor(private db: DBClient) {}

  /** 创建用户 */
  async create(username: string, passwordHash: string, qq: string): Promise<User | null> {
    const result = await this.db
      .run(
        'INSERT INTO users (username, password_hash, qq) VALUES (?, ?, ?)',
        username,
        passwordHash,
        qq,
      )
      .catch(() => null)
    if (!result?.success) return null
    return this.getById(result.meta.last_row_id as number)
  }

  /** 按 ID 查询 */
  async getById(id: number): Promise<User | null> {
    return this.db.first<User>('SELECT * FROM users WHERE id = ?', id)
  }

  /** 按用户名查询 */
  async getByUsername(username: string): Promise<User | null> {
    return this.db.first<User>('SELECT * FROM users WHERE username = ?', username)
  }

  /** 获取公开信息（不含 password_hash） */
  async getPublicById(id: number): Promise<UserPublic | null> {
    return this.db.first<UserPublic>(
      'SELECT id, username, qq, role, status, points, created_at FROM users WHERE id = ?',
      id,
    )
  }

  /** 待审批用户列表 */
  async getPending(): Promise<UserPublic[]> {
    const { results } = await this.db.all<UserPublic>(
      'SELECT id, username, qq, role, status, points, created_at FROM users WHERE status = ? ORDER BY created_at ASC',
      'pending',
    )
    return results
  }

  /** 审批用户 */
  async approve(id: number, gmId: number): Promise<boolean> {
    const result = await this.db.run(
      "UPDATE users SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
      id,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }

  /** 拒绝用户 */
  async reject(id: number): Promise<boolean> {
    const result = await this.db.run(
      "UPDATE users SET status = 'rejected', updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
      id,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }

  /** 查询 GM 列表 */
  async getGMs(): Promise<UserPublic[]> {
    const { results } = await this.db.all<UserPublic>(
      "SELECT id, username, qq, role, status, points, created_at FROM users WHERE role = 'gm' AND status = 'approved'",
    )
    return results
  }

  /** 增加积分（原子操作） */
  async addPoints(id: number, amount: number): Promise<boolean> {
    const result = await this.db.run(
      'UPDATE users SET points = points + ?, updated_at = datetime(\'now\') WHERE id = ?',
      amount,
      id,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }

  /** 扣减积分（检查余额充足） */
  async deductPoints(id: number, amount: number): Promise<boolean> {
    const result = await this.db.run(
      'UPDATE users SET points = points - ?, updated_at = datetime(\'now\') WHERE id = ? AND points >= ?',
      amount,
      id,
      amount,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }
}
