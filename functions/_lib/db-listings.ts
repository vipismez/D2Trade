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
      'INSERT INTO listings (seller_id, item_name, item_attrs, image_url, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
      sellerId,
      input.item_name,
      input.item_attrs ?? '{}',
      input.image_url ?? null,
      input.price,
      input.quantity ?? 1,
    )
    if (!result.success) return null
    return this.getById(result.meta.last_row_id as number)
  }

  /** 按 ID 查询 */
  async getById(id: number): Promise<Listing | null> {
    return this.db.first<Listing>('SELECT * FROM listings WHERE id = ?', id)
  }

  /** 按 ID 查询（含卖家名和 QQ） */
  async getByIdWithSeller(id: number): Promise<ListingWithSeller | null> {
    return this.db.first<ListingWithSeller>(
      `SELECT l.*, u.username as seller_name, u.qq as seller_qq
       FROM listings l JOIN users u ON l.seller_id = u.id
       WHERE l.id = ?`,
      id,
    )
  }

  /** 市场列表（仅 active，支持过滤和排序） */
  async getMarketList(
    page = 1,
    pageSize = 20,
    options?: {
      search?: string
      seller?: string
      sort?: 'newest' | 'oldest'
    },
  ): Promise<{ items: ListingWithSeller[]; total: number }> {
    let whereClause = "WHERE l.status = 'active'"
    const params: unknown[] = []

    if (options?.search) {
      whereClause += ' AND l.item_name LIKE ?'
      params.push(`%${options.search}%`)
    }
    if (options?.seller) {
      whereClause += ' AND u.username LIKE ?'
      params.push(`%${options.seller}%`)
    }

    const orderBy = options?.sort === 'oldest'
      ? 'l.created_at ASC'
      : 'l.created_at DESC'

    const countResult = await this.db.first<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM listings l JOIN users u ON l.seller_id = u.id ${whereClause}`,
      ...params,
    )
    const total = countResult?.cnt ?? 0

    const offset = (page - 1) * pageSize
    const { results } = await this.db.all<ListingWithSeller>(
      `SELECT l.*, u.username as seller_name, u.qq as seller_qq
       FROM listings l JOIN users u ON l.seller_id = u.id
       ${whereClause}
       ORDER BY ${orderBy}
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
    let query = `SELECT l.*, u.username as seller_name, u.qq as seller_qq
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
    if (input.image_url !== undefined) {
      fields.push('image_url = ?')
      params.push(input.image_url ?? null)
    }
    if (input.price !== undefined) {
      fields.push('price = ?')
      params.push(input.price)
    }
    if (input.quantity !== undefined) {
      fields.push('quantity = ?')
      params.push(input.quantity)
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

  /** GM 查看所有物品（含卖家名和 QQ，支持状态/名称/卖家筛选与分页） */
  async getAllWithSeller(options?: {
    status?: string
    search?: string
    seller?: string
    page?: number
    pageSize?: number
  }): Promise<{ items: ListingWithSeller[]; total: number }> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (options?.status) {
      conditions.push('l.status = ?')
      params.push(options.status)
    }
    if (options?.search) {
      conditions.push('l.item_name LIKE ?')
      params.push(`%${options.search}%`)
    }
    if (options?.seller) {
      conditions.push('u.username LIKE ?')
      params.push(`%${options.seller}%`)
    }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countResult = await this.db.first<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM listings l JOIN users u ON l.seller_id = u.id ${where}`,
      ...params,
    )
    const total = countResult?.cnt ?? 0

    const page = Math.max(1, options?.page ?? 1)
    const pageSize = Math.max(1, options?.pageSize ?? 20)
    const offset = (page - 1) * pageSize

    const { results } = await this.db.all<ListingWithSeller>(
      `SELECT l.*, u.username as seller_name, u.qq as seller_qq
       FROM listings l JOIN users u ON l.seller_id = u.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      pageSize,
      offset,
    )

    return { items: results, total }
  }

  /** GM 下架物品（不校验卖家） */
  async cancelByAdmin(id: number): Promise<boolean> {
    const result = await this.db.run(
      "UPDATE listings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND status = 'active'",
      id,
    )
    return result.success && (result.meta.changes ?? 0) > 0
  }

  /** 物理删除装备帖子（仅发布者）。
   *  旧帖子可能已产生交易记录，受外键约束，删除前需先解除 transactions.listing_id 引用 */
  async remove(id: number, sellerId: number): Promise<boolean> {
    const listing = await this.getById(id)
    if (!listing || listing.seller_id !== sellerId) return false

    const results = await this.db.batch([
      { query: 'UPDATE transactions SET listing_id = NULL WHERE listing_id = ?', params: [id] },
      { query: 'DELETE FROM listings WHERE id = ?', params: [id] },
    ])
    const delResult = results[1]
    return delResult.success && (delResult.meta.changes ?? 0) > 0
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
