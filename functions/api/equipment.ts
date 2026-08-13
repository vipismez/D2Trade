/**
 * GET /api/equipment — 装备库查询
 * 查询参数（均可选）:
 *   category: 武器/职业专用武器/防具/职业专用防具/饰品/护身符/珠宝
 *   type:     斧头/剑/腰带/...
 *   tier:     普通/扩展/精华
 *   search:   按名称模糊搜索
 */

import equipmentData from '../_lib/equipment-data.json'

interface EquipmentItem {
  name: string
  name_en: string
  quality: string
  category: string
  type: string
  tier: string
  base: string | null
  image: string | null
  attributes: Record<string, string>
  special_attrs: string[]
}

const EQUIPMENT = equipmentData as EquipmentItem[]

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  const url = new URL(context.request.url)
  const quality = url.searchParams.get('quality') || undefined
  const category = url.searchParams.get('category') || undefined
  const type = url.searchParams.get('type') || undefined
  const tier = url.searchParams.get('tier') || undefined
  const search = url.searchParams.get('search')?.trim() || undefined

  // 筛选
  let items = EQUIPMENT
  if (quality) items = items.filter((i) => i.quality === quality)
  if (category) items = items.filter((i) => i.category === category)
  if (type) items = items.filter((i) => i.type === type)
  if (tier) items = items.filter((i) => i.tier === tier)
  if (search) items = items.filter((i) => i.name.includes(search) || i.name_en.toLowerCase().includes(search.toLowerCase()))

  return Response.json({
    success: true,
    data: items,
    total: items.length,
  })
}
