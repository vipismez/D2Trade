#!/usr/bin/env python3
"""
合并白装/暗金/套装为统一的装备库数据
输出: data/equipment/unified_equipment.json
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "equipment"


def load_json(path):
    return json.load(open(path, encoding="utf-8"))


def main():
    unified = []

    # 1. 白装底材（quality=普通）
    white = load_json(DATA_DIR / "all_equipment.json")
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

    # 2. 暗金 + 套装
    quality = load_json(DATA_DIR / "quality_equipment.json")
    for eq in quality["equipment"]:
        for it in eq["items"]:
            q = eq["quality"]  # 暗金/套装
            special = list(it.get("special_attrs", []))
            if q == "套装" and it.get("set_bonus"):
                # 套装加成合并到特殊属性，标注
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

    # 去重（同 name + quality + category 的重复项）
    seen = set()
    deduped = []
    for item in unified:
        key = (item["name"], item["quality"], item["category"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    s = json.dumps(deduped, ensure_ascii=False)
    print(f"统一装备库: {len(deduped)} 件 (去重前 {len(unified)})")
    print(f"数据大小: {len(s.encode('utf-8'))/1024:.0f} KB")

    # 统计品质
    from collections import Counter
    qc = Counter(i["quality"] for i in deduped)
    print("品质统计:", dict(qc))

    out = DATA_DIR / "unified_equipment.json"
    json.dump(deduped, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"已保存: {out}")


if __name__ == "__main__":
    main()
