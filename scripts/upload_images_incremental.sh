#!/usr/bin/env bash
# 增量上传图片到 R2（跳过已存在的对象）
# 用法: R2_KEYS_FILE=/tmp/r2_keys.txt bash scripts/upload_images_incremental.sh

set -e

export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:?请设置 CLOUDFLARE_API_TOKEN}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?请设置 CLOUDFLARE_ACCOUNT_ID}"

cd "$(dirname "$0")/.."
BUCKET="d2trade-images"
IMG_DIR="data/equipment/images"
KEYS_FILE="${R2_KEYS_FILE:-/tmp/r2_keys.txt}"

# 读取已有 key 到临时文件（去重）
sort -u "$KEYS_FILE" > /tmp/r2_existing.txt 2>/dev/null || touch /tmp/r2_existing.txt

total=0
to_upload=0
skipped=0

# 收集需要上传的文件列表
: > /tmp/to_upload.txt
for f in "$IMG_DIR"/*; do
  total=$((total + 1))
  key=$(basename "$f")
  if grep -qxF "$key" /tmp/r2_existing.txt; then
    skipped=$((skipped + 1))
  else
    echo "$f" >> /tmp/to_upload.txt
    to_upload=$((to_upload + 1))
  fi
done

echo "本地图片: $total, 已存在: $skipped, 待上传: $to_upload"

count=0
failed=0
while IFS= read -r f; do
  key=$(basename "$f")
  if npx wrangler r2 object put "$BUCKET/$key" --file="$f" >/dev/null 2>&1; then
    count=$((count + 1))
  else
    echo "  [失败] $key"
    failed=$((failed + 1))
  fi
  if [ $(( (count + failed) % 20 )) -eq 0 ]; then
    echo "进度: $((count + failed))/$to_upload (成功 $count, 失败 $failed)"
  fi
done < /tmp/to_upload.txt

echo ""
echo "上传完成: 成功 $count / $to_upload, 失败 $failed"
