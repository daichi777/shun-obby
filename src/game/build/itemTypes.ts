import type { FC } from 'react'

// あたり判定（collider）の指定。
// すべて「モデルのユニット空間」で記述する（設置時に CELL 倍されてワールドに拡大される）。
// 箱（cuboid）だけを使う方針：@react-three/rapier はワールドscaleを軸ごとに正しく箱へ反映するため確実。
export interface BoxCollider {
  args: [number, number, number] // half-extents（半径）。ユニット空間
  position?: [number, number, number] // 中心オフセット（ユニット空間）
  rotation?: [number, number, number] // ラジアン（傾斜面はZ回転）
  friction?: number // 既定はrapierデフォルト。滑走面は低く(例:0.03)
  sensor?: boolean
}

// アイテムの物理あたり判定の作り方。
//   'none'        … あたり判定なし（小さな飾り。すり抜けてOK）
//   { auto: ... } … モデル形状から自動生成（hull=凸包 が無難）
//   { boxes }     … 明示の箱の集合（滑り台など、登り面/滑走面を作り分けたい場合）
// 省略時は PlacementSystem が hull 自動生成（＝とりあえず固体になる）。
export type ColliderSpec =
  | 'none'
  | { auto: 'hull' | 'cuboid' | 'trimesh' }
  | { boxes: BoxCollider[] }

// 設置できるアイテム1種類の定義。
// Model はそのアイテムの見た目（R3Fコンポーネント。原点中心・底面y=0・footprint内に収まる）。
export interface PackItem {
  id: string
  name: string // ひらがな表示名
  emoji: string // ショップ/インベントリのアイコン
  price: number // コイン
  footprint: [number, number] // 占めるグリッド数 [幅, 奥行]
  Model: FC
  collider?: ColliderSpec // あたり判定（省略時はhull自動）
}

export type Category = 'nature' | 'building' | 'fun'

export interface ItemDef extends PackItem {
  category: Category
}
