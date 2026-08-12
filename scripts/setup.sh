#!/usr/bin/env bash
# D2Trade 部署设置脚本
# 用法: bash scripts/setup.sh

set -e

echo "=== D2Trade 部署设置 ==="

# 1. 安装依赖
echo "[1/4] 安装依赖..."
npm install

# 2. 创建 D1 数据库
echo "[2/4] 创建 D1 数据库..."
npx wrangler d1 create d2trade-db 2>/dev/null || echo "  数据库可能已存在，跳过创建"

# 3. 导入 Schema
echo "[3/4] 导入数据库 Schema..."
npx wrangler d1 execute d2trade-db --file=schema.sql

# 4. 生成 JWT Secret
echo "[4/4] 配置环境变量..."
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "  生成 JWT_SECRET: ${JWT_SECRET:0:16}..."

# 写入 .dev.vars（本地开发）
cat > .dev.vars << EOF
JWT_SECRET=${JWT_SECRET}
ENVIRONMENT=development
EOF

echo ""
echo "=== 设置完成 ==="
echo ""
echo "本地开发:"
echo "  npx wrangler pages dev ./public --d1=DB=d2trade-db"
echo ""
echo "生产部署:"
echo "  npx wrangler secret put JWT_SECRET"
echo "  npx wrangler pages deploy ./public"
echo ""
echo "GM 账号需通过注册后手动在 D1 中设置 role='gm':"
echo "  npx wrangler d1 execute d2trade-db --command=\"UPDATE users SET role='gm', status='approved' WHERE username='你的用户名'\""
