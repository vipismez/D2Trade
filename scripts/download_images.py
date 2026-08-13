#!/usr/bin/env python3
"""
下载暗黑2装备图片到本地，并更新 JSON 数据的图片路径
图片以 MD5(URL) 命名，避免特殊字符问题
"""

import hashlib
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "equipment"
IMG_DIR = DATA_DIR / "images"
ALL_JSON = DATA_DIR / "all_equipment.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def url_to_key(url: str) -> str:
    """根据 URL 生成唯一文件名（MD5 前16位 + 扩展名）"""
    ext = url.rsplit(".", 1)[-1].lower() if "." in url.rsplit("/", 1)[-1] else "gif"
    if ext not in ("gif", "jpg", "jpeg", "png", "webp"):
        ext = "gif"
    digest = hashlib.md5(url.encode("utf-8")).hexdigest()[:16]
    return f"{digest}.{ext}"


def download(url: str, dest: Path) -> bool:
    """下载单个图片（带重试）"""
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            if len(data) == 0:
                raise Exception("空文件")
            dest.write_bytes(data)
            return True
        except Exception as e:
            if attempt == 2:
                print(f"    [失败] {url}: {e}")
                return False
            time.sleep(3)


def main():
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    # 读取汇总数据
    data = json.load(open(ALL_JSON, encoding="utf-8"))

    # 提取唯一 URL
    all_urls = [it["image"] for eq in data["equipment"] for it in eq["items"] if it.get("image")]
    unique_urls = sorted(set(all_urls))
    print(f"唯一图片: {len(unique_urls)} 张")

    # 下载并建立映射
    url_map = {}
    success = 0
    for i, url in enumerate(unique_urls):
        key = url_to_key(url)
        dest = IMG_DIR / key
        url_map[url] = key
        if dest.exists():
            success += 1
            continue
        if download(url, dest):
            success += 1
        if (i + 1) % 20 == 0:
            print(f"  进度: {i+1}/{len(unique_urls)}")
        time.sleep(0.3)  # 礼貌限速

    print(f"下载完成: {success}/{len(unique_urls)}")

    # 更新 JSON 中的 image 字段为 /api/image/<key>
    for eq in data["equipment"]:
        for it in eq["items"]:
            if it.get("image") and it["image"] in url_map:
                it["image"] = f"/api/image/{url_map[it['image']]}"

    # 保存汇总
    json.dump(data, open(ALL_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # 同步更新每个单独文件
    for f in DATA_DIR.glob("*.json"):
        if f.name == "all_equipment.json":
            continue
        d = json.load(open(f, encoding="utf-8"))
        for it in d.get("items", []):
            if it.get("image") and it["image"] in url_map:
                it["image"] = f"/api/image/{url_map[it['image']]}"
        json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # 保存 URL -> key 映射（用于追溯）
    json.dump(url_map, open(DATA_DIR / "image_map.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"图片已保存到: {IMG_DIR}")
    print(f"映射文件: {DATA_DIR / 'image_map.json'}")
    print(f"JSON 图片路径已更新为 /api/image/<key> 格式")


if __name__ == "__main__":
    main()
