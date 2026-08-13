#!/usr/bin/env python3
"""
暗黑2 暗金装备 + 套装装备数据收集
数据源: https://wiki.d.163.com

用法:
  python3 scripts/scrape_quality.py unique   # 只收集暗金
  python3 scripts/scrape_quality.py sets     # 只收集套装
  python3 scripts/scrape_quality.py all      # 全部收集
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

# 暗金装备类型清单: (页面名, 分类, 中文类型名)
UNIQUE_TYPES = [
    ("Unique Axes", "武器", "斧头"),
    ("Unique Swords", "武器", "剑"),
    ("Unique Daggers", "武器", "匕首"),
    ("Unique Maces", "武器", "钉头锤"),
    ("Unique Bows", "武器", "弓"),
    ("Unique Crossbows", "武器", "十字弓"),
    ("Unique Javelins", "武器", "标枪"),
    ("Unique Scepters", "武器", "权杖"),
    ("Unique Staves", "武器", "法杖"),
    ("Unique Wands", "武器", "手杖"),
    ("Unique Spears", "武器", "长矛"),
    ("Unique Polearms", "武器", "长柄武器"),
    ("Unique Throwing Weapons", "武器", "投掷类武器"),
    ("Unique Amazon Weapons", "职业专用武器", "亚马逊专用武器"),
    ("Unique Assassin Katars", "职业专用武器", "刺客爪"),
    ("Unique Sorceress Orbs", "职业专用武器", "法师天球"),
    ("Unique Belts", "防具", "腰带"),
    ("Unique Gloves", "防具", "手套"),
    ("Unique Boots", "防具", "鞋子"),
    ("Unique Helms", "防具", "头盔"),
    ("Unique Body Armor", "防具", "盔甲"),
    ("Unique Shields", "防具", "盾牌"),
    ("Unique Circlets", "防具", "头饰"),
    ("Unique Barbarian Helms", "职业专用防具", "野蛮人专用头盔"),
    ("Unique Druid Pelts", "职业专用防具", "德鲁伊专用头盔"),
    ("Unique Paladin Shields", "职业专用防具", "圣骑士专用盾牌"),
    ("Unique Necromancer Shrunken Heads", "职业专用防具", "死灵法师萎缩头颅"),
    ("Unique Rings", "其他", "戒指"),
    ("Unique Amulets", "其他", "项链"),
    ("Unique Charms", "其他", "护身符"),
    ("Unique Jewels", "其他", "珠宝"),
]

# 套装清单: (页面英文名, 中文名, 类别)
SETS = [
    ("Arctic Gear", "北极装备", "普通套装"),
    ("Hsarus' Defense", "哈斯拉柏的防御", "普通套装"),
    ("Berserker's Arsenal", "狂战士的军火库", "普通套装"),
    ("Cleglaw's Brace", "克雷得劳的支柱", "普通套装"),
    ("Infernal Tools", "地狱工具", "普通套装"),
    ("Death's Disguise", "死亡的伪装", "普通套装"),
    ("Sigon's Complete Steel", "西刚的全套刀剑", "普通套装"),
    ("Isenhart's Armory", "依森哈德的武器室", "普通套装"),
    ("Civerb's Vestments", "希弗伯的法衣", "普通套装"),
    ("Cathan's Traps", "卡珊的陷阱", "普通套装"),
    ("Angelic Raiment", "天使的衣服", "普通套装"),
    ("Vidala's Rig", "维达拉的配备", "普通套装"),
    ("Arcanna's Tricks", "阿卡娜的诡计", "普通套装"),
    ("Iratha's Finery", "依雷撒的精洗炉", "普通套装"),
    ("Milabrega's Regalia", "米拉伯佳的雪茄", "普通套装"),
    ("Tancred's Battlegear", "坦克雷的战斗工具", "普通套装"),
    ("Heaven's Brethren", "天堂的信徒", "进阶套装"),
    ("The Disciple", "门徒", "进阶套装"),
    ("Hwanin's Majesty", "华宁的威严", "进阶套装"),
    ("Cow King's Leathers", "牛魔王之皮", "进阶套装"),
    ("Naj's Ancient Vestige", "娜吉的古代遗迹", "进阶套装"),
    ("Sander's Folly", "山德的愚行", "进阶套装"),
    ("Sazabi's Grand Tribute", "沙撒璧的雄伟贡品", "进阶套装"),
    ("Orphan's Call", "孤儿的呼唤", "进阶套装"),
    ("Aldur's Watchtower", "艾尔多的守卫", "职业专用套装"),
    ("Bul-Kathos' Children", "布尔凯索的孩子", "职业专用套装"),
    ("Griswold's Legacy", "格瑞斯华尔德的遗产", "职业专用套装"),
    ("M'avina's Battle Hymn", "马维娜之战斗诗歌", "职业专用套装"),
    ("Natalya's Odium", "娜塔亚的非难", "职业专用套装"),
    ("Tal Rasha's Wrappings", "塔拉夏的外袍", "职业专用套装"),
    ("Trang-Oul's Avatar", "塔格奥的化身", "职业专用套装"),
    ("Immortal King", "不朽之王", "职业专用套装"),
]


def fetch_html(page_name: str) -> str:
    url = f"{BASE_URL}/index.php?title={urllib.parse.quote(page_name)}_(Diablo2)"
    last_err = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            last_err = e
            wait = 5 * (attempt + 1)
            print(f"    [重试 {attempt+1}/4] {page_name} ({e})，等待 {wait}s ...")
            time.sleep(wait)
    raise last_err


def strip_tags(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return text.strip()


def parse_attr_lines(text: str) -> list:
    """把属性文本按 <br /> 分割成行数组"""
    parts = re.split(r"<br\s*/?>", text)
    lines = []
    for p in parts:
        line = strip_tags(p)
        if line:
            lines.append(line)
    return lines


def parse_base_attrs(text: str) -> dict:
    """解析基础属性（key: value 形式）"""
    result = {}
    for line in parse_attr_lines(text):
        m = re.match(r"^([^=:：]+)[=:：](.*)$", line)
        if m:
            result[m.group(1).strip()] = m.group(2).strip()
        else:
            result[line] = ""
    return result


def parse_quality_table(table_html: str, tier: str | None) -> dict | None:
    """解析暗金/套装装备表格"""
    # 名称（1.4em 大字体）
    name_match = re.search(r'<span style="[^"]*1\.4em[^"]*"[^>]*>(.*?)</span>', table_html, re.S)
    if not name_match:
        return None
    name_parts = re.split(r"<br\s*/?>", name_match.group(1))
    name_cn = strip_tags(name_parts[0]) if name_parts else ""
    name_en = strip_tags(name_parts[1]) if len(name_parts) > 1 else ""
    if not name_cn:
        return None

    # 底材（链接）
    base = None
    base_match = re.search(r'<span style="font-size: \.9em;"><a[^>]*>(.*?)</a>', table_html, re.S)
    if base_match:
        base = strip_tags(base_match.group(1))

    # 图片
    image = None
    img_match = re.search(r'<img[^>]+src="([^"]+)"', table_html)
    if img_match:
        img_src = img_match.group(1)
        image = img_src if img_src.startswith("http") else BASE_URL + img_src

    # 基础属性（灰色）
    base_attrs = {}
    base_match = re.search(r'<span style="color: #CCCCCC[^"]*"[^>]*>(.*?)</span>', table_html, re.S)
    if base_match:
        base_attrs = parse_base_attrs(base_match.group(1))

    # 特殊属性（蓝色 #4169E1）
    special_attrs = []
    special_match = re.search(r'<span style="color:#4169E1[^"]*"[^>]*>(.*?)</span>', table_html, re.S)
    if special_match:
        special_attrs = parse_attr_lines(special_match.group(1))

    # 套装加成（绿色 #00FF00，仅套装）
    set_bonus = []
    set_match = re.search(r'<span style="color:#00FF00[^"]*"[^>]*>(.*?)</span>', table_html, re.S)
    if set_match:
        set_bonus = parse_attr_lines(set_match.group(1))

    return {
        "name": name_cn,
        "name_en": name_en,
        "base": base,
        "tier": tier,
        "image": image,
        "base_attrs": base_attrs,
        "special_attrs": special_attrs,
        "set_bonus": set_bonus,
    }


def split_by_tier(html: str) -> list[tuple[str | None, str]]:
    """按 h2 标题（普通/扩展/精华）分割内容"""
    positions = []
    for m in re.finditer(r"<h2[^>]*>\s*<span[^>]*>(.*?)</span>\s*</h2>", html, re.S):
        tier_name = strip_tags(m.group(1))
        if tier_name in ("普通", "扩展", "精华"):
            positions.append((m.start(), m.end(), tier_name))

    if not positions:
        return [(None, html)]

    segments = []
    for i, (start, end, tier_name) in enumerate(positions):
        seg_end = positions[i + 1][0] if i + 1 < len(positions) else len(html)
        segments.append((tier_name, html[end:seg_end]))
    return segments


def extract_tables(html: str) -> list[str]:
    return re.findall(r"<table[^>]*>(.*?)</table>", html, re.S)


def scrape_unique(type_en: str, category: str, type_cn: str) -> dict:
    print(f"[暗金] {type_en} ({type_cn}) ...")
    html = fetch_html(type_en)
    items = []
    for tier, segment in split_by_tier(html):
        for t in extract_tables(segment):
            item = parse_quality_table(t, tier)
            if item:
                items.append(item)
    print(f"  -> {len(items)} 件")
    return {
        "quality": "暗金",
        "category": category,
        "type": type_cn,
        "type_en": type_en,
        "source": f"{BASE_URL}/index.php?title={urllib.parse.quote(type_en)}_(Diablo2)",
        "items": items,
    }


def scrape_set(set_en: str, set_cn: str, set_cat: str) -> dict:
    print(f"[套装] {set_en} ({set_cn}) ...")
    html = fetch_html(set_en)
    items = []
    for t in extract_tables(html):
        item = parse_quality_table(t, None)
        if item:
            items.append(item)
    print(f"  -> {len(items)} 件部件")
    return {
        "quality": "套装",
        "category": set_cat,
        "type": set_cn,
        "type_en": set_en,
        "source": f"{BASE_URL}/index.php?title={urllib.parse.quote(set_en)}_(Diablo2)",
        "items": items,
    }


def save_json(data: dict, fname: str):
    with open(OUTPUT_DIR / fname, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    unique_data = []
    set_data = []

    if mode in ("unique", "all"):
        for type_en, cat, cn in UNIQUE_TYPES:
            try:
                d = scrape_unique(type_en, cat, cn)
                unique_data.append(d)
                save_json(d, f"unique_{type_en.replace(' ', '_')}.json")
            except Exception as e:
                print(f"  [错误] {type_en}: {e}")
            time.sleep(2)

    if mode in ("sets", "all"):
        for set_en, cn, cat in SETS:
            try:
                d = scrape_set(set_en, cn, cat)
                set_data.append(d)
                save_json(d, f"set_{set_en.replace(' ', '_').replace(chr(39), '')}.json")
            except Exception as e:
                print(f"  [错误] {set_en}: {e}")
            time.sleep(2)

    # 汇总
    all_data = unique_data + set_data
    summary = {
        "version": 1,
        "source": BASE_URL,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_items": sum(len(d["items"]) for d in all_data),
        "equipment": all_data,
    }
    save_json(summary, "quality_equipment.json")

    u_count = sum(len(d["items"]) for d in unique_data)
    s_count = sum(len(d["items"]) for d in set_data)
    print(f"\n完成! 暗金: {len(unique_data)} 类型 / {u_count} 件, 套装: {len(set_data)} 套 / {s_count} 件")


if __name__ == "__main__":
    main()
