/**
 * Transactions 表 CRUD 操作
 */

import type { DBClient } from './db-client'
import type { Transaction, TransactionWithUsers, TransactionType } from './types'

export class TransactionDB {
  constructor(private db: DBClient) {}

  /** 创建交易记录 */
  async create(params: {
    type: TransactionType
    listingId?: number | null
    buyerId?: number | null
    sellerId?: number | null
    gmId?: number | null
    amount: number
    note?: string
  }): Promise<Transaction | null> {
    const result = await this.db.run(
      `INSERT INTO transactions (type, listing_id, buyer_id, seller_id, gm_id, amount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params.type,
      params.listingId ?? null,
      params.buyerId ?? null,
      params.sellerId ?? null,
      params.gmId ?? null,
      params.amount,
      params.note ?? '',
    )
    if (!result.success) return null
    return this.getById(result.meta.last_row_id as number)
  }

  /** 按 ID 查询 */
  async getById(id: number): Promise<Transaction | null> {
    return this.db.first<Transaction>('SELECT * FROM transactions WHERE id = ?', id)
  }

  /** 按 ID 查询（含关联用户名） */
  async getByIdWithUsers(id: number): Promise<TransactionWithUsers | null> {
    return this.db.first<TransactionWithUsers>(
      `SELECT t.*,
              b.username as buyer_name,
              s.username as seller_name,
              g.username as gm_name,
              l.item_name
       FROM transactions t
       LEFT JOIN users b ON t.buyer_id = b.id
       LEFT JOIN users s ON t.seller_id = s.id
       LEFT JOIN users g ON t.gm_id = g.id
       LEFT JOIN listings l ON t.listing_id = l.id
       WHERE t.id = ?`,
      id,
    )
  }

  /** 查询用户的交易记录 */
  async getByUser(
    userId: number,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: TransactionWithUsers[]; total: number }> {
    const countResult = await this.db.first<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE buyer_id = ? OR seller_id = ?`,
      userId,
      userId,
    )
    const total = countResult?.cnt ?? 0

    const offset = (page - 1) * pageSize
    const { results } = await this.db.all<TransactionWithUsers>(
      `SELECT t.*,
              b.username as buyer_name,
              s.username as seller_name,
              g.username as gm_name,
              l.item_name
       FROM transactions t
       LEFT JOIN users b ON t.buyer_id = b.id
       LEFT JOIN users s ON t.seller_id = s.id
       LEFT JOIN users g ON t.gm_id = g.id
       LEFT JOIN listings l ON t.listing_id = l.id
       WHERE t.buyer_id = ? OR t.seller_id = ?
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      userId,
      userId,
      pageSize,
      offset,
    )

    return { items: results, total }
  }

  /** 查询全部交易记录（GM） */
  async getAll(
    page = 1,
    pageSize = 20,
    type?: TransactionType,
  ): Promise<{ items: TransactionWithUsers[]; total: number }> {
    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []

    if (type) {
      whereClause += ' AND t.type = ?'
      params.push(type)
    }

    const countResult = await this.db.first<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM transactions t ${whereClause}`,
      ...params,
    )
    const total = countResult?.cnt ?? 0

    const offset = (page - 1) * pageSize
    const { results } = await this.db.all<TransactionWithUsers>(
      `SELECT t.*,
              b.username as buyer_name,
              s.username as seller_name,
              g.username as gm_name,
              l.item_name
       FROM transactions t
       LEFT JOIN users b ON t.buyer_id = b.id
       LEFT JOIN users s ON t.seller_id = s.id
       LEFT JOIN users g ON t.gm_id = g.id
       LEFT JOIN listings l ON t.listing_id = l.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      pageSize,
      offset,
    )

    return { items: results, total }
  }

  /** 标记交易为已回退 */
  async markRolledBack(id: number): Promise<boolean> {
    const result = await this.db.run(
      "UPDATE transactions SET status = 'rolled_back' WHERE id = ? AND status = 'completed'",
      id,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }
}
