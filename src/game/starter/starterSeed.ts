import { useBuild } from '../build/buildStore'
import type { PlacedItem } from '../build/buildStore'

// 🌱 おてほんシード（最初の30秒設計の一部）。
// はじめて遊ぶとき（セーブなし）だけ、西のひらけた広場に「見本の作品」を置いておく。
//   ・世界がからっぽに見えない／「じぶんでも置ける」が伝わる
//   ・けす→もちものに戻る→また置ける（さわって学べる教材になる）
//   ・ずかんには登録しない（じぶんで手に入れたときの喜びは残す）
// anchor はセルグリッド（CELL=4）。groupCenter=(ax+w/2-0.5)*4 でワールド位置になる。
const SEED_ITEMS: Omit<PlacedItem, 'uid'>[] = [
  { itemId: 'suberidai', anchor: [-5, 0], rot: 0 }, // 西の広場の見本すべりだい（中心 x≒-18）
  { itemId: 'ki', anchor: [-6, 2], rot: 0 },
  { itemId: 'ki', anchor: [-6, -3], rot: 0 },
  { itemId: 'ohana', anchor: [-4, 1], rot: 0 },
  { itemId: 'ohana', anchor: [-4, -2], rot: 0 },
]

// セーブが無い初回起動時に呼ぶ。すでに何か置かれていれば何もしない（二重シード防止）。
// uid は 'seed*'（クエスト集計から除外するための印。'p*' 採番ともぶつからない）。
export function seedStarterWorld() {
  const b = useBuild.getState()
  if (b.placed.length > 0) return
  b.hydrate({
    inventory: b.inventory,
    placed: SEED_ITEMS.map((it, i) => ({ ...it, uid: `seed${i + 1}` })),
  })
}

// 見本（シード）ではなく、じぶんで置いたものだけを数えるフィルタ（クエスト用）
export const isSeedUid = (uid: string): boolean => uid.startsWith('seed')
