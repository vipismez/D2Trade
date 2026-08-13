# D2Trade · 暗黑破坏神2 私服交易系统

基于 Cloudflare Pages + Functions + D1 构建的积分交易平台。

## 功能

- **注册审批制**：玩家提交用户名/密码/QQ，GM 审批后激活
- **装备市场**：表格展示（物品/卖家账号+QQ/数量/价格/缩略图），点击查看详情，积分购买
- **装备发布**：支持指定数量、编辑、删除，无形物品标记
- **装备库**：内置 1200+ 暗黑2原版装备（白装/独有/套装/符文/符文之语/橙色/宝石，含品质/分类/类型/等级筛选）
- **GM 回收**：玩家提交申请 → GM 审批并支付积分（申请-审批流程）
- **GM 管理**：用户审批、全部用户管理（创建/编辑/禁用）、积分发放、市场管理（下架）、交易查阅与回退
- **暗黑2风格 UI**：石质边框、哥特金饰、羊皮纸质感

## 项目结构

```
├── functions/              # Pages Functions（后端 + API）
│   ├── _middleware.ts      # CORS + 安全头
│   ├── env.d.ts            # 全局 Env 类型
│   ├── _lib/               # 共享后端逻辑
│   │   ├── types.ts        # 类型定义
│   │   ├── jwt.ts          # JWT 编解码（Web Crypto）
│   │   ├── auth.ts         # PBKDF2 密码哈希
│   │   ├── auth-middleware.ts # requireAuth / requireGM
│   │   ├── db-client.ts    # D1 封装
│   │   ├── db-users.ts     # 用户 CRUD
│   │   ├── db-listings.ts  # 装备 CRUD
│   │   ├── db-transactions.ts # 交易 CRUD
│   │   ├── db-buyback.ts   # 回收申请 CRUD
│   │   ├── equipment-data.json # 装备库（1200+ 条）
│   │   └── trade.ts        # 交易核心逻辑
│   └── api/
│       ├── auth/           # 注册/登录/当前用户
│       ├── listings/       # 装备市场（发布/编辑/删除）
│       ├── transactions/   # 交易
│       ├── buyback/        # 回收申请（用户侧）
│       ├── equipment.ts    # 装备库查询
│       └── admin/          # GM 管理
│           ├── users/      # 用户审批/全部用户/创建/编辑/禁用
│           ├── buyback-requests/ # 回收申请审批
│           ├── listings/   # 市场管理（查看/下架）
│           └── transactions/ # 交易查阅/回退
├── public/                 # 暗黑2风格前端 SPA
│   ├── css/d2-theme.css
│   └── js/
│       ├── api.js / auth.js
│       └── pages/ (login, market, mylistings, buyback, transactions, admin)
├── schema.sql              # 数据库建表
├── wrangler.toml           # Cloudflare 配置
└── scripts/                # 辅助脚本
```

## 部署信息

- **站点地址**: https://d2trade.pages.dev
- **数据库**: Cloudflare D1 `d2trade-db`
- **部署命令**:
  ```bash
  export CLOUDFLARE_API_TOKEN="你的token"
  export CLOUDFLARE_ACCOUNT_ID="你的账户ID"
  npx wrangler pages deploy ./public --project-name d2trade --commit-dirty=true
  ```

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 一键设置（创建 D1 数据库 + 导入 schema + 生成 JWT 密钥）
bash scripts/setup.sh

# 3. 本地开发
npx wrangler pages dev ./public --d1=DB=d2trade-db

# 4. 设置 GM 账号
# 先通过前端注册一个账号，然后在 D1 中设置为 GM：
npx wrangler d1 execute d2trade-db \
  --command="UPDATE users SET role='gm', status='approved' WHERE username='你的用户名'"

# 5. 生产部署
npx wrangler secret put JWT_SECRET       # 设置 JWT 密钥
npx wrangler pages deploy ./public        # 部署前端 + Functions
```

## API 端点

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（username/password/qq） |
| POST | `/api/auth/login` | 登录 → JWT |
| GET  | `/api/auth/me` | 当前用户信息 |

### 市场（公开 + 需登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/listings` | 市场列表（?page=&search=&seller=） |
| GET  | `/api/listings/mine` | 我的发布 |
| POST | `/api/listings` | 发布装备（支持 quantity） |
| GET  | `/api/listings/:id` | 装备详情 |
| PUT  | `/api/listings/:id` | 编辑装备（名称/属性/价格/数量） |
| DELETE | `/api/listings/:id` | 删除帖子 |

### 交易
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/transactions/buy` | 购买装备 |
| GET  | `/api/transactions` | 我的交易记录（含对方 QQ） |

### 装备回收申请（用户侧）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/buyback` | 提交回收申请 |
| GET  | `/api/buyback` | 我的回收申请 |

### 装备库
| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/equipment` | 装备查询（?quality=&category=&type=&tier=&search=） |

### GM 管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/admin/users/pending` | 待审批用户 |
| GET  | `/api/admin/users` | 全部用户 |
| POST | `/api/admin/users` | 创建用户 |
| PUT  | `/api/admin/users/:id` | 编辑用户 |
| DELETE | `/api/admin/users/:id` | 禁用用户（软删除） |
| PUT  | `/api/admin/users/approve` | 审批通过 |
| PUT  | `/api/admin/users/reject` | 拒绝 |
| POST | `/api/admin/grant` | 发放积分 |
| GET  | `/api/admin/buyback-requests` | 回收申请列表（?status=） |
| POST | `/api/admin/buyback-requests/:id` | 处理申请（approve/reject） |
| GET  | `/api/admin/listings` | 市场管理（?status=&search=&seller=&page=&pageSize=） |
| DELETE | `/api/admin/listings/:id` | GM 下架物品 |
| GET  | `/api/admin/transactions` | 全部交易（含买卖双方 QQ） |
| POST | `/api/admin/transactions/rollback` | 回退交易 |

## 数据库

4 张 D1 表（SQLite）：

- `users` — 用户名/密码哈希/QQ/角色/审批状态/积分/是否禁用
- `listings` — 装备名称/属性 JSON/价格/数量/状态
- `transactions` — 交易类型/关联 listing/买卖双方/金额/状态
- `buyback_requests` — 回收申请（装备/期望积分/状态/处理 GM）

## 技术栈

- **Runtime**: Cloudflare Pages Functions
- **数据库**: Cloudflare D1 (SQLite)
- **认证**: JWT HS256（Web Crypto API 原生，零外部依赖）
- **密码**: PBKDF2 SHA-256 100,000 次迭代
- **前端**: Vanilla JS SPA + 暗黑2风格 CSS
- **CLI**: Wrangler
