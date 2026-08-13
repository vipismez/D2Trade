#!/usr/bin/env python3
"""
暗黑2原版装备库数据收集脚本
数据源: https://wiki.d.163.com (网易暗黑百科)

用法:
  python3 scripts/scrape_equipment.py            # 全量收集
  python3 scripts/scrape_equipment.py Belts      # 只收集指定类型(英文名)
  python3 scripts/scrape_equipment.py --list     # 列出所有装备类型
"""

import json
import re
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

BASE_URL = "https://wiki.d.163.com"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "equipment"

# 装备类型清单: (英文页面名, 分类, 中文类型名)
EQUIPMENT_TYPES = [
    # 武器
    ("Axes", "武器", "斧头"),
    ("Swords", "武器", "剑"),
    ("Daggers", "武器", "匕首"),
    ("Maces", "武器", "钉头锤"),
    ("Bows", "武器", "弓"),
    ("Crossbows", "武器", "十字弓"),
    ("Javelins", "武器", "标枪"),
    ("Scepters", "武器", "权杖"),
    ("Staves", "武器", "法杖"),
    ("Wands", "武器", "手杖"),
    ("Spears", "武器", "长矛"),
    ("Polearms", "武器", "长柄武器"),
    ("Throwing Weapons", "武器", "投掷类武器"),
    # 职业专用武器
    ("Amazon Weapons", "职业专用武器", "亚马逊专用武器"),
    ("Assassin Katars", "职业专用武器", "刺客爪"),
    ("Sorceress Orbs", "职业专用武器", "法师天球"),
    # 防具
    ("Belts", "防具", "腰带"),
    ("Gloves", "防具", "手套"),
    ("Boots", "防具", "鞋子"),
    ("Helms", "防具", "头盔"),
    ("Body Armor", "防具", "盔甲"),
    ("Shields", "防具", "盾牌"),
    ("Circlets", "防具", "头饰"),
    # 职业专用防具
    ("Barbarian Helms", "职业专用防具", "野蛮人专用头盔"),
    ("Druid Pelts", "职业专用防具", "德鲁伊专用头盔"),
    ("Paladin Shields", "职业专用防具", "圣骑士专用盾牌"),
    ("Necromancer Shrunken Heads", "职业专用防具", "死灵法师萎缩头颅"),
    # 其他(首饰)
    ("Rings", "其他", "戒指"),
    ("Amulets", "其他", "项链"),
    ("Charms", "其他", "护身符"),
]


def fetch_html(page_name: str) -> str:
    """抓取 wiki 页面 HTML（带重试，避免限流）"""
    url = f"{BASE_URL}/index.php?title={urllib.parse.quote(page_name)}_(Diablo2)"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
    }
    last_err = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            last_err = e
            wait = 5 * (attempt + 1)
            print(f"    [重试 {attempt+1}/4] {page_name} 失败({e})，等待 {wait}s ...")
            time.sleep(wait)
    raise last_err


def strip_tags(text: str) -> str:
    """去除 HTML 标签"""
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return text.strip()


def parse_attributes(attr_text: str) -> dict:
    """解析属性文本为 key-value 字典"""
    result = {}
    # 按 <br /> 分割
    parts = re.split(r"<br\s*/?>", attr_text)
    for part in parts:
        text = strip_tags(part)
        if not text:
            continue
        # 用 = 或 : 分割 key/value
        m = re.match(r"^([^=:：]+)[=:：](.*)$", text)
        if m:
            key = m.group(1).strip()
            value = m.group(2).strip()
            result[key] = value
        else:
            result[text] = ""
    return result


def parse_equipment_tables(html: str) -> list:
    """解析页面中按 tier 分段的装备列表"""
    # 找到所有 h2 标题（普通/扩展/精华）
    # 按位置分割
    tier_positions = []
    for m in re.finditer(r"<h2[^>]*>\s*<span[^>]*>(.*?)</span>\s*</h2>", html, re.S):
        tier_name = strip_tags(m.group(1))
        if tier_name in ("普通", "扩展", "精华"):
            tier_positions.append((m.start(), m.end(), tier_name))

    equipment = []
    if not tier_positions:
        # 没有分级(如首饰)，全部作为无 tier
        tables = re.findall(r"<table[^>]*>(.*?)</table>", html, re.S)
        for t in tables:
            item = parse_item_table(t)
            if item:
                equipment.append(item)
        return equipment

    # 分段处理
    for i, (start, end, tier_name) in enumerate(tier_positions):
        seg_end = tier_positions[i + 1][0] if i + 1 < len(tier_positions) else len(html)
        segment = html[end:seg_end]
        tables = re.findall(r"<table[^>]*>(.*?)</table>", segment, re.S)
        for t in tables:
            item = parse_item_table(t)
            if item:
                item["tier"] = tier_name
                equipment.append(item)

    return equipment


def parse_item_table(table_html: str) -> dict | None:
    """解析单个装备表格"""
    # 名称（大字体 span，中文名<br />英文名），颜色可能是 #FFFFFF 或 # 或空
    name_match = re.search(r'<span style="[^"]*1\.4em[^"]*"[^>]*>(.*?)</span>', table_html, re.S)
    if not name_match:
        return None

    name_raw = name_match.group(1)
    name_parts = re.split(r"<br\s*/?>", name_raw)
    name_cn = strip_tags(name_parts[0]) if name_parts else ""
    name_en = strip_tags(name_parts[1]) if len(name_parts) > 1 else ""

    if not name_cn:
        return None

    # 图片
    img_match = re.search(r'<img[^>]+src="([^"]+)"', table_html)
    image = None
    if img_match:
        img_src = img_match.group(1)
        image = img_src if img_src.startswith("http") else BASE_URL + img_src

    # 套装 (绿色 #00FF00)
    set_item = None
    set_match = re.search(r'<span style="color:#00FF00[^"]*"[^>]*>(.*?)</span>', table_html, re.S)
    if set_match:
        set_text = strip_tags(set_match.group(1)).replace("套装:", "").replace("套装：", "").strip()
        if set_text and set_text != "-":
            set_item = set_text

    # 暗金 (暗金色 #A59263)
    unique_item = None
    unique_match = re.search(r'<span style="color:#A59263[^"]*"[^>]*>(.*?)</span>', table_html, re.S)
    if unique_match:
        unique_text = strip_tags(unique_match.group(1)).replace("暗金:", "").replace("暗金：", "").strip()
        if unique_text and unique_text != "-":
            unique_item = unique_text

    # 属性 (灰色 #CCCCCC)
    attributes = {}
    attr_match = re.search(r'<span style="color: #CCCCCC[^"]*"[^>]*>(.*?)</span>', table_html, re.S)
    if attr_match:
        attributes = parse_attributes(attr_match.group(1))

    return {
        "name": name_cn,
        "name_en": name_en,
        "tier": None,  # 由分段逻辑填充
        "image": image,
        "attributes": attributes,
        "set_item": set_item,
        "unique_item": unique_item,
    }


def scrape_type(type_en: str, category: str, type_cn: str) -> dict:
    """抓取一个装备类型的所有装备"""
    print(f"[抓取] {type_en} ({type_cn}) ...")

    # 护身符页面是文字介绍，无装备表格，手动补充 3 种基础形式
    if type_en == "Charms":
        items = [
            {
                "name": "小型护身符",
                "name_en": "Small Charm",
                "tier": "未分级",
                "image": None,
                "attributes": {"尺寸": "1x1", "说明": "占用背包 1 格"},
                "set_item": None,
                "unique_item": None,
            },
            {
                "name": "大型护身符",
                "name_en": "Large Charm",
                "tier": "未分级",
                "image": None,
                "attributes": {"尺寸": "2x1", "说明": "占用背包 2 格"},
                "set_item": None,
                "unique_item": None,
            },
            {
                "name": "超大型护身符",
                "name_en": "Grand Charm",
                "tier": "未分级",
                "image": None,
                "attributes": {"尺寸": "3x1", "说明": "占用背包 3 格"},
                "set_item": None,
                "unique_item": None,
            },
        ]
        print(f"  -> 共 {len(items)} 件（手动补充）")
        return {
            "category": category,
            "type": type_cn,
            "type_en": type_en,
            "source": f"{BASE_URL}/index.php?title={urllib.parse.quote(type_en)}_(Diablo2)",
            "items": items,
        }

    html = fetch_html(type_en)
    items = parse_equipment_tables(html)
    print(f"  -> 共 {len(items)} 件装备")

    tiers = {}
    for item in items:
        t = item.get("tier") or "未分级"
        tiers[t] = tiers.get(t, 0) + 1
    if tiers:
        print(f"  分级统计: {tiers}")

    return {
        "category": category,
        "type": type_cn,
        "type_en": type_en,
        "source": f"{BASE_URL}/index.php?title={urllib.parse.quote(type_en)}_(Diablo2)",
        "items": items,
    }


def main():
    args = sys.argv[1:]
    if "--list" in args:
        for type_en, cat, cn in EQUIPMENT_TYPES:
            print(f"{type_en:30s} | {cat:10s} | {cn}")
        return

    # 确定要抓取的类型
    target = None
    for a in args:
        if not a.startswith("--"):
            target = a
            break

    types_to_scrape = EQUIPMENT_TYPES
    if target:
        types_to_scrape = [t for t in EQUIPMENT_TYPES if t[0].lower() == target.lower()]
        if not types_to_scrape:
            print(f"未找到装备类型: {target}")
            return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_data = []

    for type_en, category, type_cn in types_to_scrape:
        try:
            data = scrape_type(type_en, category, type_cn)
            all_data.append(data)
            # 每个类型单独存一个文件
            fname = type_en.replace(" ", "_") + ".json"
            with open(OUTPUT_DIR / fname, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"  [错误] {type_en}: {e}")
        time.sleep(2)  # 礼貌限速，避免触发反爬

    # 汇总文件
    summary = {
        "version": 1,
        "source": BASE_URL,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_types": len(all_data),
        "total_items": sum(len(d["items"]) for d in all_data),
        "equipment": all_data,
    }
    with open(OUTPUT_DIR / "all_equipment.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n完成! 共 {len(all_data)} 个类型, {summary['total_items']} 件装备")
    print(f"输出目录: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
