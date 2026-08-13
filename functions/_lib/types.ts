/**
 * D2Trade 共享类型定义
 */

// ── 用户 ──

export type UserRole = 'player' | 'gm'
export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: number
  username: string
  password_hash: string
  qq: string
  role: UserRole
  status: UserStatus
  points: number
  created_at: string
  updated_at: string
}

export interface UserPublic {
  id: number
  username: string
  qq: string
  role: UserRole
  status: UserStatus
  points: number
  created_at: string
}

// ── 装备 ──

export type ListingStatus = 'active' | 'sold' | 'cancelled'

export interface Listing {
  id: number
  seller_id: number
  item_name: string
  item_attrs: string // JSON
  image_url: string | null
  price: number
  status: ListingStatus
  created_at: string
  updated_at: string
}

export interface ListingWithSeller extends Listing {
  seller_name: string
}

export interface CreateListingInput {
  item_name: string
  item_attrs?: string
  image_url?: string
  price: number
}

// ── 交易 ──

export type TransactionType = 'trade' | 'buyback' | 'grant' | 'rollback'
export type TransactionStatus = 'completed' | 'rolled_back'

export interface Transaction {
  id: number
  type: TransactionType
  listing_id: number | null
  buyer_id: number | null
  seller_id: number | null
  gm_id: number | null
  amount: number
  status: TransactionStatus
  note: string
  created_at: string
}

export interface TransactionWithUsers extends Transaction {
  buyer_name: string | null
  seller_name: string | null
  gm_name: string | null
  item_name: string | null
}

// ── JWT ──

export interface JwtPayload {
  sub: number // user id
  username: string
  role: UserRole
  iat: number
  exp: number
}

// ── API 响应 ──

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}
