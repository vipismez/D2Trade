# D2Trade · 暗黑破坏神2 私服交易系统

基于 Cloudflare Pages + Functions + D1 构建的积分交易平台。

## 功能

- **注册审批制**：玩家提交用户名/密码/QQ，GM 审批后激活
- **装备市场**：卖家发布装备，买家使用积分购买
- **积分交易**：买家直接转账积分给卖家，GM 可回退争议交易
- **GM 回收**：GM 回收玩家装备并支付积分
- **GM 管理**：用户审批、积分发放、交易查阅与回退
- **暗黑2风格 UI**：石质边框、哥特金饰、羊皮纸质感

## 项目结构

```
├── src/                    # 后端逻辑（共享模块）
│   ├── types/index.ts      # 类型定义
│   ├── utils/
│   │   ├── jwt.ts          # JWT 编解码（Web Crypto）
│   │   └── auth.ts         # PBKDF2 密码哈希
│   ├── middleware/auth.ts  # requireAuth / requireGM
│   ├── db/
│   │   ├── client.ts       # D1 封装
│   │   ├── users.ts        # 用户 CRUD
│   │   ├── listings.ts     # 装备 CRUD
│   │   └── transactions.ts # 交易 CRUD
│   └── services/trade.ts   # 交易核心逻辑
├── functions/              # Pages Functions API
│   ├── _middleware.ts      # CORS + 安全头
│   ├── api/auth/           # 注册/登录
│   ├── api/listings/       # 装备市场
│   ├── api/transactions/   # 交易
│   └── api/admin/          # GM 管理
├── public/                 # 暗黑2风格前端 SPA
│   ├── css/d2-theme.css
│   └── js/
│       ├── api.js / auth.js
│       └── pages/ (login, market, mylistings, transactions, admin)
├── schema.sql              # 数据库建表
├── seed.sql                # 种子数据
└── scripts/setup.sh        # 一键部署脚本
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
| GET  | `/api/listings` | 市场列表（?page=&search=） |
| GET  | `/api/listings/mine` | 我的发布 |
| POST | `/api/listings` | 发布装备 |
| GET  | `/api/listings/:id` | 装备详情 |
| PUT  | `/api/listings/:id` | 编辑装备 |
| DELETE | `/api/listings/:id` | 下架 |

### 交易
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/transactions/buy` | 购买装备 |
| GET  | `/api/transactions` | 我的交易记录 |

### GM 管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/admin/users/pending` | 待审批用户 |
| PUT  | `/api/admin/users/approve` | 审批通过 |
| PUT  | `/api/admin/users/reject` | 拒绝 |
| POST | `/api/admin/grant` | 发放积分 |
| POST | `/api/admin/buyback` | 回收装备 |
| GET  | `/api/admin/transactions` | 全部交易 |
| POST | `/api/admin/transactions/rollback` | 回退交易 |

## 数据库

3 张 D1 表（SQLite）：

- `users` — 用户名/密码哈希/QQ/角色/审批状态/积分
- `listings` — 装备名称/属性 JSON/价格/状态
- `transactions` — 交易类型/关联 listing/买卖双方/金额/状态

## 技术栈

- **Runtime**: Cloudflare Pages Functions
- **数据库**: Cloudflare D1 (SQLite)
- **认证**: JWT HS256（Web Crypto API 原生，零外部依赖）
- **密码**: PBKDF2 SHA-256 100,000 次迭代
- **前端**: Vanilla JS SPA + 暗黑2风格 CSS
- **CLI**: Wrangler
