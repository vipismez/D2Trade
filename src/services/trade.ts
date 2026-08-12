/**
 * 交易核心服务
 * 所有积分变动操作在此集中管理，确保原子性
 */

import type { DBClient } from '../db/client'
import { UserDB } from '../db/users'
import { ListingDB } from '../db/listings'
import { TransactionDB } from '../db/transactions'
import type { Transaction } from '../types'

export class TradeService {
  private users: UserDB
  private listings: ListingDB
  private transactions: TransactionDB

  constructor(private db: DBClient) {
    this.users = new UserDB(db)
    this.listings = new ListingDB(db)
    this.transactions = new TransactionDB(db)
  }

  /**
   * 购买装备
   * 原子操作：扣减买家积分 → 增加卖家积分 → 标记装备已售 → 创建交易记录
   * 使用 D1 batch 保证事务性
   */
  async executeTrade(
    listingId: number,
    buyerId: number,
  ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> {
    // 1. 获取装备信息
    const listing = await this.listings.getById(listingId)
    if (!listing) {
      return { success: false, error: '装备不存在' }
    }
    if (listing.status !== 'active') {
      return { success: false, error: '装备已下架或已售出' }
    }
    if (listing.seller_id === buyerId) {
      return { success: false, error: '不能购买自己的装备' }
    }

    // 2. 获取买卖双方
    const buyer = await this.users.getById(buyerId)
    const seller = await this.users.getById(listing.seller_id)
    if (!buyer || !seller) {
      return { success: false, error: '用户不存在' }
    }
    if (buyer.status !== 'approved' || seller.status !== 'approved') {
      return { success: false, error: '账号状态异常' }
    }
    if (buyer.points < listing.price) {
      return { success: false, error: '积分不足' }
    }

    // 3. 原子执行（batch）
    const results = await this.db.batch([
      // 扣减买家积分（带余额检查）
      {
        query: 'UPDATE users SET points = points - ?, updated_at = datetime(\'now\') WHERE id = ? AND points >= ?',
        params: [listing.price, buyerId, listing.price],
      },
      // 增加卖家积分
      {
        query: 'UPDATE users SET points = points + ?, updated_at = datetime(\'now\') WHERE id = ?',
        params: [listing.price, seller.id],
      },
      // 标记装备为已售（乐观锁）
      {
        query: "UPDATE listings SET status = 'sold', updated_at = datetime('now') WHERE id = ? AND status = 'active'",
        params: [listingId],
      },
    ])

    // 检查 batch 结果
    const [deductResult, addResult, soldResult] = results
    if (!deductResult.success || (deductResult.meta.changes ?? 0) === 0) {
      return { success: false, error: '积分不足或扣款失败' }
    }
    if (!addResult.success) {
      // 极端情况回滚：理论上 batch 中一个失败都失败，但 D1 batch 不是完整 ACID 事务
      // 记录错误日志以便 GM 人工处理
      console.error(`Trade failed: add points to seller ${seller.id} failed`)
      return { success: false, error: '交易异常，请联系 GM' }
    }
    if (!soldResult.success || (soldResult.meta.changes ?? 0) === 0) {
      // 装备可能被并发购买
      return { success: false, error: '装备已被他人购买' }
    }

    // 4. 创建交易记录
    const transaction = await this.transactions.create({
      type: 'trade',
      listingId,
      buyerId,
      sellerId: seller.id,
      amount: listing.price,
      note: `购买装备: ${listing.item_name}`,
    })

    return {
      success: true,
      transaction: transaction ?? undefined,
    }
  }

  /**
   * GM 回收装备（直接给玩家加积分）
   */
  async executeBuyback(
    playerId: number,
    gmId: number,
    itemName: string,
    amount: number,
    note?: string,
  ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> {
    const player = await this.users.getById(playerId)
    if (!player) return { success: false, error: '玩家不存在' }
    if (player.status !== 'approved') return { success: false, error: '玩家账号未审批' }

    const result = await this.users.addPoints(playerId, amount)
    if (!result) return { success: false, error: '发放积分失败' }

    const transaction = await this.transactions.create({
      type: 'buyback',
      sellerId: playerId,
      gmId,
      amount,
      note: note || `GM 回收装备: ${itemName}`,
    })

    return { success: true, transaction: transaction ?? undefined }
  }

  /**
   * GM 发放积分
   */
  async grantPoints(
    playerId: number,
    gmId: number,
    amount: number,
    note?: string,
  ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> {
    const player = await this.users.getById(playerId)
    if (!player) return { success: false, error: '玩家不存在' }
    if (player.status !== 'approved') return { success: false, error: '玩家账号未审批' }

    const result = await this.users.addPoints(playerId, amount)
    if (!result) return { success: false, error: '发放积分失败' }

    const transaction = await this.transactions.create({
      type: 'grant',
      buyerId: playerId,
      gmId,
      amount,
      note: note || 'GM 发放积分',
    })

    return { success: true, transaction: transaction ?? undefined }
  }

  /**
   * 回退交易
   * 原子操作：反转积分 + 恢复装备状态 + 标记原交易为 rolled_back
   */
  async executeRollback(
    transactionId: number,
    gmId: number,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    // 1. 获取原交易
    const tx = await this.transactions.getById(transactionId)
    if (!tx) return { success: false, error: '交易记录不存在' }
    if (tx.status === 'rolled_back') return { success: false, error: '该交易已被回退' }

    const results = await this.db.batch([
      // 回退买家积分（如果有买家）
      tx.buyer_id
        ? {
            query: 'UPDATE users SET points = points + ?, updated_at = datetime(\'now\') WHERE id = ?',
            params: [tx.amount, tx.buyer_id],
          }
        : { query: 'SELECT 1', params: [] },

      // 回退卖家积分（如果有卖家）
      tx.seller_id
        ? {
            query: 'UPDATE users SET points = points - ?, updated_at = datetime(\'now\') WHERE id = ? AND points >= ?',
            params: [tx.amount, tx.seller_id, tx.amount],
          }
        : { query: 'SELECT 1', params: [] },

      // 恢复装备状态
      tx.listing_id
        ? {
            query: "UPDATE listings SET status = 'active', updated_at = datetime('now') WHERE id = ?",
            params: [tx.listing_id],
          }
        : { query: 'SELECT 1', params: [] },

      // 标记原交易为已回退
      {
        query: "UPDATE transactions SET status = 'rolled_back' WHERE id = ? AND status = 'completed'",
        params: [transactionId],
      },
    ])

    // 创建回退记录
    await this.transactions.create({
      type: 'rollback',
      listingId: tx.listing_id,
      buyerId: tx.buyer_id,
      sellerId: tx.seller_id,
      gmId,
      amount: tx.amount,
      note: `回退交易 #${transactionId}，原因: ${reason}`,
    })

    return { success: true }
  }
}
