#!/usr/bin/env bash
# 批量上传装备图片到 R2
# 用法: bash scripts/upload_images.sh

set -e

export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:?请设置 CLOUDFLARE_API_TOKEN}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?请设置 CLOUDFLARE_ACCOUNT_ID}"

cd "$(dirname "$0")/.."
BUCKET="d2trade-images"
IMG_DIR="data/equipment/images"

total=$(ls "$IMG_DIR" | wc -l)
count=0
failed=0

for f in "$IMG_DIR"/*; do
  key=$(basename "$f")
  if npx wrangler r2 object put "$BUCKET/$key" --file="$f" >/dev/null 2>&1; then
    count=$((count + 1))
  else
    echo "  [失败] $key"
    failed=$((failed + 1))
  fi
  if [ $(( (count + failed) % 20 )) -eq 0 ]; then
    echo "进度: $((count + failed))/$total (成功 $count, 失败 $failed)"
  fi
done

echo ""
echo "上传完成: 成功 $count / $total, 失败 $failed"
