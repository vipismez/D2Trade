/**
 * BuybackRequests 表 CRUD 操作
 */

import type { DBClient } from './db-client'
import type { BuybackRequest, BuybackRequestWithUser } from './types'

export class BuybackRequestDB {
  constructor(private db: DBClient) {}

  /** 用户提交回收申请 */
  async create(input: {
    userId: number
    item_name: string
    item_attrs?: string
    image_url?: string | null
    expected_points?: number
  }): Promise<BuybackRequest | null> {
    const result = await this.db.run(
      'INSERT INTO buyback_requests (user_id, item_name, item_attrs, image_url, expected_points) VALUES (?, ?, ?, ?, ?)',
      input.userId,
      input.item_name,
      input.item_attrs ?? '{}',
      input.image_url ?? null,
      input.expected_points ?? 0,
    )
    if (!result.success) return null
    return this.getById(result.meta.last_row_id as number)
  }

  /** 按 ID 查询 */
  async getById(id: number): Promise<BuybackRequest | null> {
    return this.db.first<BuybackRequest>('SELECT * FROM buyback_requests WHERE id = ?', id)
  }

  /** 按 ID 查询（含用户名和 QQ） */
  async getByIdWithUser(id: number): Promise<BuybackRequestWithUser | null> {
    return this.db.first<BuybackRequestWithUser>(
      `SELECT br.*, u.username, u.qq
       FROM buyback_requests br JOIN users u ON br.user_id = u.id
       WHERE br.id = ?`,
      id,
    )
  }

  /** 用户查看自己的申请 */
  async getByUser(userId: number): Promise<BuybackRequestWithUser[]> {
    const { results } = await this.db.all<BuybackRequestWithUser>(
      `SELECT br.*, u.username, u.qq
       FROM buyback_requests br JOIN users u ON br.user_id = u.id
       WHERE br.user_id = ?
       ORDER BY br.created_at DESC`,
      userId,
    )
    return results
  }

  /** GM 查看申请列表（可筛选状态） */
  async getAll(status?: 'pending' | 'approved' | 'rejected'): Promise<BuybackRequestWithUser[]> {
    let query = `SELECT br.*, u.username, u.qq
                 FROM buyback_requests br JOIN users u ON br.user_id = u.id`
    const params: unknown[] = []

    if (status) {
      query += ' WHERE br.status = ?'
      params.push(status)
    }
    query += ' ORDER BY br.created_at DESC'

    const { results } = await this.db.all<BuybackRequestWithUser>(query, ...params)
    return results
  }

  /** GM 批准申请（更新状态与备注） */
  async approve(id: number, gmId: number, note?: string): Promise<boolean> {
    const result = await this.db.run(
      "UPDATE buyback_requests SET status = 'approved', gm_id = ?, gm_note = ?, updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
      gmId,
      note ?? '',
      id,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }

  /** GM 拒绝申请 */
  async reject(id: number, gmId: number, note?: string): Promise<boolean> {
    const result = await this.db.run(
      "UPDATE buyback_requests SET status = 'rejected', gm_id = ?, gm_note = ?, updated_at = datetime('now') WHERE id = ? AND status = 'pending'",
      gmId,
      note ?? '',
      id,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }
}
