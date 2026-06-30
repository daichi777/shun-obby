import type { ItemDef, PackItem, Category } from './itemTypes'
import { natureItems } from './packs/naturePack'
import { buildingItems } from './packs/buildingPack'
import { funItems } from './packs/funPack'
import { slideItems } from './packs/slidesPack'

const tag = (items: PackItem[], category: Category): ItemDef[] =>
  items.map((i) => ({ ...i, category }))

// 全アイテムカタログ（ショップに並ぶ）。エージェントチーム生成の12種。
export const CATALOG: ItemDef[] = [
  ...tag(natureItems, 'nature'),
  ...tag(buildingItems, 'building'),
  ...tag(funItems, 'fun'),
  ...tag(slideItems, 'fun'), // 追加スライダー（スライドタブに並ぶ）
]

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  CATALOG.map((i) => [i.id, i]),
)
