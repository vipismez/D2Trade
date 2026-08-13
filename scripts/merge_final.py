#!/usr/bin/env python3
"""
合并所有装备数据（白装/暗金/套装/合成/符文/符文之语/宝石）
并重命名品质: 暗金→独有, 合成→橙色
输出: data/equipment/unified_equipment.json
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "equipment"


def load(path):
    return json.load(open(path, encoding="utf-8"))


def main():
    unified = []

    # 1. 白装底材（quality=普通）
    white = load(DATA_DIR / "all_equipment.json")
    for eq in white["equipment"]:
        for it in eq["items"]:
            unified.append({
                "name": it["name"],
                "name_en": it.get("name_en", ""),
                "quality": "普通",
                "category": eq["category"],
                "type": eq["type"],
                "tier": it.get("tier") or "未分级",
                "base": None,
                "image": it.get("image"),
                "attributes": it.get("attributes", {}),
                "special_attrs": [],
            })

    # 2. 暗金 + 套装（quality 重命名）
    quality_data = load(DATA_DIR / "quality_equipment.json")
    for eq in quality_data["equipment"]:
        q = eq["quality"]
        q_map = {"暗金": "独有", "套装": "套装"}
        q = q_map.get(q, q)
        for it in eq["items"]:
            special = list(it.get("special_attrs", []))
            if q == "套装" and it.get("set_bonus"):
                special = special + ["【套装加成】"] + it["set_bonus"]
            unified.append({
                "name": it["name"],
                "name_en": it.get("name_en", ""),
                "quality": q,
                "category": eq["category"],
                "type": eq["type"],
                "tier": it.get("tier") or "未分级",
                "base": it.get("base"),
                "image": it.get("image"),
                "attributes": it.get("base_attrs", {}),
                "special_attrs": special,
            })

    # 3. 符文/符文之语/合成/宝石
    extra = load(DATA_DIR / "extra_equipment.json")
    for eq in extra["equipment"]:
        q = eq["quality"]
        for it in eq["items"]:
            if q == "宝石":
                # 宝石展开为 5 个等级
                for g in it.get("grades", []):
                    unified.append({
                        "name": g["name"],
                        "name_en": "",
                        "quality": "宝石",
                        "category": "宝石",
                        "type": it["name"],
                        "tier": "未分级",
                        "base": None,
                        "image": None,
                        "attributes": {
                            "等级": g["level"],
                            "镶嵌武器": g.get("weapon", ""),
                            "镶嵌盾牌": g.get("shield", ""),
                            "镶嵌头盔衣服": g.get("armor", ""),
                        },
                        "special_attrs": [],
                    })
            elif q == "符文之语":
                unified.append({
                    "name": it["name"],
                    "name_en": it.get("name_en", ""),
                    "quality": "符文之语",
                    "category": "符文之语",
                    "type": it.get("sockets_base", "符文之语"),
                    "tier": "未分级",
                    "base": it.get("sockets_base"),
                    "image": None,
                    "attributes": {"符文配方": it.get("runes", ""), "需求等级": str(it.get("level_req", ""))},
                    "special_attrs": it.get("special_attrs", []),
                })
            elif q == "符文":
                unified.append({
                    "name": it["name"],
                    "name_en": it.get("name_en", ""),
                    "quality": "符文",
                    "category": "符文",
                    "type": f"{it.get('number','')}#",
                    "tier": "未分级",
                    "base": None,
                    "image": it.get("image"),
                    "attributes": {
                        "序号": str(it.get("number", "")),
                        "级别": it.get("level", ""),
                        "掉落率": it.get("drop_rate", ""),
                        "主要来源": it.get("boss", ""),
                        "难度": it.get("difficulty", ""),
                    },
                    "special_attrs": [],
                })
            elif q == "合成":
                unified.append({
                    "name": it["name"],
                    "name_en": "",
                    "quality": "橙色",
                    "category": "合成",
                    "type": it.get("series", "合成装备"),
                    "tier": "未分级",
                    "base": it.get("base"),
                    "image": it.get("image"),
                    "attributes": {"合成配方": it.get("recipe", "")},
                    "special_attrs": it.get("special_attrs", []),
                })

    # 去重
    seen = set()
    deduped = []
    for item in unified:
        key = (item["name"], item["quality"], item["type"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    s = json.dumps(deduped, ensure_ascii=False)
    print(f"统一装备库: {len(deduped)} 条 (去重前 {len(unified)})")
    print(f"数据大小: {len(s.encode('utf-8'))/1024:.0f} KB")

    from collections import Counter
    qc = Counter(i["quality"] for i in deduped)
    print("品质统计:", dict(qc))

    out = DATA_DIR / "unified_equipment.json"
    json.dump(deduped, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"已保存: {out}")


if __name__ == "__main__":
    main()
