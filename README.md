# D2Trade

Cloudflare Pages + Workers 全栈应用框架。

## 项目结构

```
├── src/                    # Workers 核心代码
│   ├── index.ts            # 入口 — 路由分发 + 环境类型
│   ├── router.ts           # 简易路由（支持 URLPattern）
│   ├── routes/api.ts       # API 路由注册
│   ├── handlers/           # 请求处理器
│   │   ├── health.ts       # 健康检查
│   │   └── example.ts      # 示例 CRUD
│   └── utils/response.ts   # 统一响应工具
├── functions/              # Pages Functions
│   ├── _middleware.ts      # 全局中间件（安全头等）
│   └── api/hello.ts        # Pages Functions 示例端点
├── public/                 # 静态资源（Pages 前端）
│   ├── index.html
│   ├── style.css
│   └── app.js
├── wrangler.toml           # Cloudflare 配置
├── tsconfig.json
└── package.json
```

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 本地开发（Pages 模式 — 含静态资源 + Functions）
npm run dev

# 3. 仅启动 Worker
npm run dev:worker

# 4. 部署
npm run deploy
```

## API 端点

| 方法     | 路径                | 说明         |
| -------- | ------------------- | ------------ |
| `GET`    | `/api/v1/health`    | 健康检查     |
| `GET`    | `/api/v1/items`     | 列表         |
| `GET`    | `/api/v1/items/:id` | 获取单个     |
| `POST`   | `/api/v1/items`     | 创建         |
| `PUT`    | `/api/v1/items/:id` | 更新         |
| `DELETE` | `/api/v1/items/:id` | 删除         |
| `GET`    | `/api/hello`        | Pages Func   |

## Cloudflare 生态绑定

在 `wrangler.toml` 中按需开启：

- **KV** — 键值存储
- **D1** — SQLite 数据库（边缘）
- **R2** — 对象存储
- **Queues** — 消息队列
- **Durable Objects** — 有状态协作对象

## 技术栈

- **Runtime**: Cloudflare Workers
- **语言**: TypeScript
- **路由**: URLPattern（原生）
- **静态托管**: Cloudflare Pages
- **CLI**: Wrangler
