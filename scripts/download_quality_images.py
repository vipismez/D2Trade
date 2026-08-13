#!/usr/bin/env python3
"""下载暗金/套装装备图片到本地并更新 JSON 路径"""

import hashlib
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "equipment"
IMG_DIR = DATA_DIR / "images"
QUALITY_JSON = DATA_DIR / "quality_equipment.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def url_to_key(url: str) -> str:
    ext = url.rsplit(".", 1)[-1].lower() if "." in url.rsplit("/", 1)[-1] else "gif"
    if ext not in ("gif", "jpg", "jpeg", "png", "webp"):
        ext = "gif"
    return f"{hashlib.md5(url.encode('utf-8')).hexdigest()[:16]}.{ext}"


def download(url: str, dest: Path) -> bool:
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
    data = json.load(open(QUALITY_JSON, encoding="utf-8"))

    all_urls = [it["image"] for eq in data["equipment"] for it in eq["items"] if it.get("image")]
    unique_urls = sorted(set(all_urls))
    print(f"唯一图片: {len(unique_urls)} 张")

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
        time.sleep(0.3)

    print(f"下载完成: {success}/{len(unique_urls)}")

    # 更新汇总 JSON
    for eq in data["equipment"]:
        for it in eq["items"]:
            if it.get("image") and it["image"] in url_map:
                it["image"] = f"/api/image/{url_map[it['image']]}"
    json.dump(data, open(QUALITY_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # 同步更新单独文件
    for f in DATA_DIR.glob("*.json"):
        if f.name in ("all_equipment.json", "quality_equipment.json", "image_map.json", "slim_equipment.json"):
            continue
        d = json.load(open(f, encoding="utf-8"))
        for it in d.get("items", []):
            if it.get("image") and it["image"] in url_map:
                it["image"] = f"/api/image/{url_map[it['image']]}"
        json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # 保存映射
    json.dump(url_map, open(DATA_DIR / "quality_image_map.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"图片已保存到: {IMG_DIR}")
    print("JSON 图片路径已更新")


if __name__ == "__main__":
    main()
