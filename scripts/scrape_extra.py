#!/usr/bin/env python3
"""
暗黑2 符文 + 符文之语 + 合成装备 + 宝石 数据收集
数据源: https://wiki.d.163.com
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
}

# 33 个符文的页面名（用于排除）
RUNE_PAGES = {"El", "Eld", "Tir", "Nef", "Eth", "Ith", "Tal", "Ral", "Ort", "Thul",
              "Amn", "Sol", "Shael", "Dol", "Hel", "Io", "Lum", "Ko", "Fal", "Lem",
              "Pul", "Um", "Mal", "Ist", "Gul", "Vex", "Ohm", "Lo", "Sur", "Ber",
              "Jah", "Cham", "Zod"}


def fetch(url: str) -> str:
    last_err = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            last_err = e
            time.sleep(5 * (attempt + 1))
    raise last_err


def strip_tags(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&bull;", "•")
    return text.strip()


def page_url(page_name: str, suffix="Diablo2") -> str:
    return f"{BASE_URL}/index.php?title={urllib.parse.quote(page_name)}_({suffix})"


# ── 1. 符文 ──

def scrape_runes() -> list:
    print("[符文] 收集 33 个符文 ...")
    html = fetch(page_url("Runes"))
    tables = re.findall(r"<table[^>]*>(.*?)</table>", html, re.S)
    runes = []
    for t in tables:
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", t, re.S)
        for row in rows:
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
            if len(cells) < 7:
                continue
            num = strip_tags(cells[0]).strip()
            if not num.isdigit():
                continue
            name_cell = cells[1]
            name_match = re.search(r'<a[^>]*>([^<]+)</a>', name_cell)
            name_full = strip_tags(name_cell) if not name_match else strip_tags(name_match.group(1))
            # 名称格式 "El 艾尔" 或 "艾尔"
            parts = name_full.split()
            if len(parts) >= 2 and re.match(r"^[A-Za-z]", parts[0]):
                name_en = parts[0]
                name_cn = " ".join(parts[1:])
            else:
                name_en = ""
                name_cn = name_full

            img_match = re.search(r'<img[^>]+src="([^"]+)"', cells[2])
            image = None
            if img_match:
                image = img_match.group(1) if img_match.group(1).startswith("http") else BASE_URL + img_match.group(1)

            runes.append({
                "name": name_cn,
                "name_en": name_en,
                "number": int(num),
                "image": image,
                "level": strip_tags(cells[3]).strip(),
                "drop_rate": strip_tags(cells[4]).strip(),
                "boss": strip_tags(cells[5]).strip(),
                "difficulty": strip_tags(cells[6]).strip(),
            })
    print(f"  -> {len(runes)} 个符文")
    return runes


# ── 2. 符文之语 ──

def get_runeword_list() -> list[tuple[str, str]]:
    """从 Runewords 页面提取符文之语列表 (英文页面名, 中文名)"""
    html = fetch(page_url("Runewords"))
    links = re.findall(r'href="/index\.php\?title=([^"#]+)\(Diablo_II\)"[^>]*>([^<]{1,30})</a>', html)
    result = []
    for title, cn in links:
        cn = cn.strip()
        if not cn or cn in RUNE_PAGES or "#" in cn:
            continue
        # 排除符文（RUNE_PAGES 里的是英文名，但 title 可能是 URL 编码的英文）
        decoded = urllib.parse.unquote(title).replace("_", " ")
        base = decoded.replace("%27", "'")
        # 简单判断：符文页面名是单个单词（如 El），符文之语是多词或含特殊字符
        result.append((title, cn))
    return result


def scrape_runeword(page_name: str, name_cn: str) -> dict | None:
    # page_name 已经是 URL 编码的（如 Ancient%27s_Pledge）
    html = fetch(f"{BASE_URL}/index.php?title={page_name}(Diablo_II)")
    # 名称（1.4em 大字体）
    name_match = re.search(r'<span style="[^"]*1\.4em[^"]*"[^>]*>(.*?)</span>', html, re.S)
    if not name_match:
        return None
    name_parts = re.split(r"<br\s*/?>", name_match.group(1))
    # 优先用索引页的中文名（详情页可能有残缺），回退到详情页解析
    name = name_cn if name_cn else (strip_tags(name_parts[0]) if name_parts else "")
    name_en = strip_tags(name_parts[1]) if len(name_parts) > 1 else ""

    # 底材类型（"3 凹槽 盔甲"）
    base_info = None
    base_match = re.search(r'<span style="font-size: \.9em;">(.*?)</span>', html, re.S)
    if base_match:
        base_info = strip_tags(base_match.group(1))

    # 符文配方（含链接的 span）
    runes_text = None
    runes_match = re.search(r'<span style="font-size: \.9em;">\s*(.*?)\s*</span>', html, re.S)
    # 上面的 base_info 和 runes 可能都是 .9em，需要分别处理
    # 第二个 .9em span 是符文配方
    all_9em = re.findall(r'<span style="font-size: \.9em;">(.*?)</span>', html, re.S)
    if len(all_9em) >= 2:
        runes_raw = all_9em[1]
        runes_text = re.sub(r"<br\s*/?>", " ", runes_raw)
        runes_text = strip_tags(runes_text)

    # 需求等级（#CCCCCC）
    level_req = None
    lvl_match = re.search(r'<span style="color: #CCCCCC[^"]*"[^>]*>(.*?)</span>', html, re.S)
    if lvl_match:
        lvl_text = strip_tags(lvl_match.group(1))
        m = re.search(r"需求等级[:：]?\s*(\d+)", lvl_text)
        if m:
            level_req = int(m.group(1))

    # 属性（#4169E1 蓝色）
    special_attrs = []
    attr_match = re.search(r'<span style="color:#4169E1[^"]*"[^>]*>(.*?)</span>', html, re.S)
    if attr_match:
        parts = re.split(r"<br\s*/?>", attr_match.group(1))
        for p in parts:
            line = strip_tags(p)
            if line:
                special_attrs.append(line)

    # 图片：符文之语没有独立图片，跳过
    return {
        "name": name,
        "name_en": name_en,
        "sockets_base": base_info,
        "runes": runes_text,
        "level_req": level_req,
        "special_attrs": special_attrs,
    }


def scrape_runewords() -> list:
    print("[符文之语] 获取列表 ...")
    rw_list = get_runeword_list()
    print(f"  -> {len(rw_list)} 个符文之语")
    items = []
    for i, (page, cn) in enumerate(rw_list):
        try:
            rw = scrape_runeword(page, cn)
            if rw:
                items.append(rw)
        except Exception as e:
            print(f"  [错误] {cn}: {e}")
        if (i + 1) % 10 == 0:
            print(f"  进度: {i+1}/{len(rw_list)}")
        time.sleep(1)
    print(f"  -> 收集 {len(items)} 个符文之语")
    return items


# ── 3. 合成装备 ──

CRAFTED_SERIES = [
    ("Blood Items", "血腥系列"),
    ("Caster Items", "施法者系列"),
    ("Hit Power Items", "强力打击系列"),
    ("Safety Items", "安全系列"),
]


def scrape_crafted() -> list:
    print("[合成装备] 收集 4 个系列 ...")
    all_items = []
    for page, series_cn in CRAFTED_SERIES:
        print(f"  {series_cn} ...")
        html = fetch(page_url(page))
        tables = re.findall(r"<table[^>]*>(.*?)</table>", html, re.S)
        for t in tables:
            if "1.4em" not in t:
                continue
            name_match = re.search(r'<span style="[^"]*1\.4em[^"]*"[^>]*>(.*?)</span>', t, re.S)
            if not name_match:
                continue
            name = strip_tags(name_match.group(1))

            base = None
            base_match = re.search(r'<span style="font-size: \.9em;"><a[^>]*>(.*?)</a>', t, re.S)
            if base_match:
                base = strip_tags(base_match.group(1))

            # 配方（第二个 .9em span）
            all_9em = re.findall(r'<span style="font-size: \.9em;">(.*?)</span>', t, re.S)
            recipe = None
            if len(all_9em) >= 2:
                recipe = strip_tags(re.sub(r"<br\s*/?>", " ", all_9em[1]))

            image = None
            img_match = re.search(r'<img[^>]+src="([^"]+)"', t)
            if img_match:
                img = img_match.group(1)
                image = img if img.startswith("http") else BASE_URL + img

            special_attrs = []
            attr_match = re.search(r'<span style="color:#4169E1[^"]*"[^>]*>(.*?)</span>', t, re.S)
            if attr_match:
                for p in re.split(r"<br\s*/?>", attr_match.group(1)):
                    line = strip_tags(p)
                    if line:
                        special_attrs.append(line)

            all_items.append({
                "name": name,
                "name_en": "",
                "series": series_cn,
                "base": base,
                "recipe": recipe,
                "image": image,
                "special_attrs": special_attrs,
            })
        time.sleep(1)
    print(f"  -> {len(all_items)} 件合成装备")
    return all_items


# ── 4. 宝石 ──

def scrape_gems() -> list:
    print("[宝石] 收集 7 种宝石 ...")
    html = fetch(page_url("Gems"))
    tables = re.findall(r"<table[^>]*>(.*?)</table>", html, re.S)
    gems = []
    current_name = None
    for t in tables:
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", t, re.S)
        if not rows:
            continue
        first_text = strip_tags(re.sub(r"<[^>]+>", "", rows[0]))
        # 标题表格（1 行，不含"级别"表头）
        if len(rows) == 1 and "级别" not in first_text:
            current_name = first_text.replace("(宝石)", "").strip()
            continue
        # 数据表格（表头含"级别"和"宝石名称"）
        if "级别" in first_text and "宝石名称" in first_text:
            grades = []
            for r in rows[1:]:
                cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)
                if len(cells) < 5:
                    continue
                level = strip_tags(cells[1])
                if not level.isdigit():
                    continue
                grades.append({
                    "level": level,
                    "name": strip_tags(cells[2]),
                    "weapon": strip_tags(cells[3]),
                    "shield": strip_tags(cells[4]),
                    "armor": strip_tags(cells[5]),
                })
            if current_name and grades:
                gems.append({"name": current_name, "grades": grades})
    print(f"  -> {len(gems)} 种宝石")
    return gems


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    result = {"equipment": []}

    if mode in ("runes", "all"):
        runes = scrape_runes()
        result["equipment"].append({"quality": "符文", "category": "其他", "type": "符文", "items": runes})

    if mode in ("runewords", "all"):
        rw = scrape_runewords()
        result["equipment"].append({"quality": "符文之语", "category": "其他", "type": "符文之语", "items": rw})

    if mode in ("crafted", "all"):
        crafted = scrape_crafted()
        result["equipment"].append({"quality": "合成", "category": "其他", "type": "合成装备", "items": crafted})

    if mode in ("gems", "all"):
        gems = scrape_gems()
        result["equipment"].append({"quality": "宝石", "category": "其他", "type": "宝石", "items": gems})

    out = OUTPUT_DIR / "extra_equipment.json"
    json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    total = sum(len(e["items"]) for e in result["equipment"])
    print(f"\n完成! {total} 件，输出: {out}")


if __name__ == "__main__":
    main()
