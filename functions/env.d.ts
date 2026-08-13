/**
 * 全局环境类型声明（Pages Functions）
 * 所有 functions/api/ 下的文件可直接引用 Env 类型
 */

interface Env {
  DB: D1Database
  JWT_SECRET: string
  ENVIRONMENT: string
}
