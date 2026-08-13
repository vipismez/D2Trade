/**
 * Listings 表 CRUD 操作
 */

import type { DBClient } from './db-client'
import type { Listing, ListingWithSeller, CreateListingInput } from './types'

export class ListingDB {
  constructor(private db: DBClient) {}

  /** 创建装备发布 */
  async create(sellerId: number, input: CreateListingInput): Promise<Listing | null> {
    const result = await this.db.run(
      'INSERT INTO listings (seller_id, item_name, item_attrs, price) VALUES (?, ?, ?, ?)',
      sellerId,
      input.item_name,
      input.item_attrs ?? '{}',
      input.price,
    )
    if (!result.success) return null
    return this.getById(result.meta.last_row_id as number)
  }

  /** 按 ID 查询 */
  async getById(id: number): Promise<Listing | null> {
    return this.db.first<Listing>('SELECT * FROM listings WHERE id = ?', id)
  }

  /** 按 ID 查询（含卖家名） */
  async getByIdWithSeller(id: number): Promise<ListingWithSeller | null> {
    return this.db.first<ListingWithSeller>(
      `SELECT l.*, u.username as seller_name
       FROM listings l JOIN users u ON l.seller_id = u.id
       WHERE l.id = ?`,
      id,
    )
  }

  /** 市场列表（仅 active，按时间倒序） */
  async getMarketList(
    page = 1,
    pageSize = 20,
    search?: string,
  ): Promise<{ items: ListingWithSeller[]; total: number }> {
    let whereClause = "WHERE l.status = 'active'"
    const params: unknown[] = []

    if (search) {
      whereClause += ' AND l.item_name LIKE ?'
      params.push(`%${search}%`)
    }

    const countResult = await this.db.first<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM listings l ${whereClause}`,
      ...params,
    )
    const total = countResult?.cnt ?? 0

    const offset = (page - 1) * pageSize
    const { results } = await this.db.all<ListingWithSeller>(
      `SELECT l.*, u.username as seller_name
       FROM listings l JOIN users u ON l.seller_id = u.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      pageSize,
      offset,
    )

    return { items: results, total }
  }

  /** 我的发布 */
  async getBySeller(
    sellerId: number,
    status?: string,
  ): Promise<ListingWithSeller[]> {
    let query = `SELECT l.*, u.username as seller_name
                 FROM listings l JOIN users u ON l.seller_id = u.id
                 WHERE l.seller_id = ?`
    const params: unknown[] = [sellerId]

    if (status) {
      query += ' AND l.status = ?'
      params.push(status)
    }

    query += ' ORDER BY l.created_at DESC'
    const { results } = await this.db.all<ListingWithSeller>(query, ...params)
    return results
  }

  /** 更新装备信息 */
  async update(id: number, sellerId: number, input: Partial<CreateListingInput>): Promise<boolean> {
    const fields: string[] = []
    const params: unknown[] = []

    if (input.item_name !== undefined) {
      fields.push('item_name = ?')
      params.push(input.item_name)
    }
    if (input.item_attrs !== undefined) {
      fields.push('item_attrs = ?')
      params.push(input.item_attrs)
    }
    if (input.price !== undefined) {
      fields.push('price = ?')
      params.push(input.price)
    }

    if (fields.length === 0) return false

    fields.push("updated_at = datetime('now')")
    params.push(id, sellerId)

    const result = await this.db.run(
      `UPDATE listings SET ${fields.join(', ')} WHERE id = ? AND seller_id = ? AND status = 'active'`,
      ...params,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }

  /** 下架装备 */
  async cancel(id: number, sellerId: number): Promise<boolean> {
    const result = await this.db.run(
      "UPDATE listings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND seller_id = ? AND status = 'active'",
      id,
      sellerId,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }

  /** 标记为已售（乐观锁：仅 active → sold） */
  async markSold(id: number, buyerId: number): Promise<Listing | null> {
    const result = await this.db.run(
      "UPDATE listings SET status = 'sold', updated_at = datetime('now') WHERE id = ? AND status = 'active'",
      id,
    )
    if (!result.success || (result.meta.changes ?? 0) === 0) return null
    return this.getById(id)
  }

  /** 恢复为 active（rollback 时使用） */
  async restoreActive(id: number): Promise<boolean> {
    const result = await this.db.run(
      "UPDATE listings SET status = 'active', updated_at = datetime('now') WHERE id = ? AND status = 'sold'",
      id,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }
}
