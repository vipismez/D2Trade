/**
 * D1 数据库客户端封装
 * 提供类型安全的 SQL 查询方法
 */

import type { D1Database, D1Result } from '@cloudflare/workers-types'

export class DBClient {
  constructor(private db: D1Database) {}

  /** 执行查询，返回多行 */
  async all<T = Record<string, unknown>>(
    query: string,
    ...params: unknown[]
  ): Promise<{ results: T[]; success: boolean; meta: unknown }> {
    const result = await this.db.prepare(query).bind(...params).all<T>()
    return result as { results: T[]; success: boolean; meta: unknown }
  }

  /** 执行查询，返回第一行 */
  async first<T = Record<string, unknown>>(
    query: string,
    ...params: unknown[]
  ): Promise<T | null> {
    const result = await this.db.prepare(query).bind(...params).first<T>()
    return result ?? null
  }

  /** 执行写操作（INSERT/UPDATE/DELETE），返回变更信息 */
  async run(
    query: string,
    ...params: unknown[]
  ): Promise<D1Result> {
    return this.db.prepare(query).bind(...params).run()
  }

  /** 批量执行多条 SQL，在同一个事务中 */
  async batch(statements: Array<{ query: string; params: unknown[] }>): Promise<D1Result[]> {
    const prepared = statements.map((s) =>
      this.db.prepare(s.query).bind(...s.params),
    )
    return this.db.batch(prepared)
  }

  /** 执行原始 SQL（用于建表等） */
  async exec(query: string): Promise<D1Result> {
    return this.db.exec(query)
  }
}

/** 从环境绑定中创建 DBClient 实例 */
export function createDB(env: { DB: D1Database }): DBClient {
  return new DBClient(env.DB)
}
