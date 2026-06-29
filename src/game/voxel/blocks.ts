// ブロック定義（S0 で凍結）。
// 5歳児向けアートディレクションとして flat な faceColors を採用（テクスチャ非採用＝§0.2 の意図的逸脱）。
// id はインデックスと一致。0 は AIR 予約。

export type BlockId = number

export const AIR: BlockId = 0

export interface BlockType {
  id: BlockId
  name: string
  displayName: string // 子供向け（ひらがな）
  emoji: string // ホットバーのアイコン代わり
  solid: boolean // 当たり判定があるか（歩ける/ぶつかる）
  opaque: boolean // 不透明か（隣接面のカリング判定／光を通すかに使う）
  transparent: boolean // 半透明描画（ガラス/みず）
  emission: number // ブロック光の発光量（0..15。ライト=15）
  colorTop: number
  colorSide: number
  colorBottom: number
}

// 内部 name -> id を引くための列挙（コードからの参照用）
export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  WOOD: 6,
  LEAVES: 7,
  BRICK: 8,
  RAINBOW: 9,
  GLASS: 10,
  CLOUD: 11,
  LIGHT: 12,
} as const

// 配列インデックス === id。AIR を含め先頭に置く。
export const BLOCKS: BlockType[] = [
  { id: 0, name: 'air', displayName: 'なし', emoji: '⬜', solid: false, opaque: false, transparent: false, emission: 0, colorTop: 0x000000, colorSide: 0x000000, colorBottom: 0x000000 },
  { id: 1, name: 'grass', displayName: 'くさ', emoji: '🌱', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0x6abe30, colorSide: 0x7a5b3a, colorBottom: 0x6b4a2f },
  { id: 2, name: 'dirt', displayName: 'つち', emoji: '🟫', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0x7a5b3a, colorSide: 0x6b4a2f, colorBottom: 0x6b4a2f },
  { id: 3, name: 'stone', displayName: 'いし', emoji: '⬛', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0x8c8c8c, colorSide: 0x808080, colorBottom: 0x767676 },
  { id: 4, name: 'sand', displayName: 'すな', emoji: '🟨', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0xe6d59a, colorSide: 0xddc987, colorBottom: 0xd4bd78 },
  { id: 5, name: 'water', displayName: 'みず', emoji: '💧', solid: false, opaque: false, transparent: true, emission: 0, colorTop: 0x3a7be6, colorSide: 0x356fd0, colorBottom: 0x2f63bd },
  { id: 6, name: 'wood', displayName: 'き', emoji: '🪵', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0xb9904f, colorSide: 0x6e4f2e, colorBottom: 0xb9904f },
  { id: 7, name: 'leaves', displayName: 'はっぱ', emoji: '🍃', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0x4fa83a, colorSide: 0x47962f, colorBottom: 0x3f8429 },
  { id: 8, name: 'brick', displayName: 'レンガ', emoji: '🧱', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0xae5a3f, colorSide: 0x9e4a34, colorBottom: 0x8e4030 },
  { id: 9, name: 'rainbow', displayName: 'にじいろ', emoji: '🌈', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0xff5fa2, colorSide: 0xff7fce, colorBottom: 0xc05fff },
  { id: 10, name: 'glass', displayName: 'ガラス', emoji: '🔷', solid: true, opaque: false, transparent: true, emission: 0, colorTop: 0xbfe6ff, colorSide: 0xbfe6ff, colorBottom: 0xbfe6ff },
  { id: 11, name: 'cloud', displayName: 'くも', emoji: '☁️', solid: true, opaque: true, transparent: false, emission: 0, colorTop: 0xffffff, colorSide: 0xf2f6fa, colorBottom: 0xe6edf3 },
  { id: 12, name: 'light', displayName: 'ライト', emoji: '💡', solid: true, opaque: true, transparent: false, emission: 15, colorTop: 0xfff3a0, colorSide: 0xffe968, colorBottom: 0xffdf3a },
]

// 子供がホットバーで選べる設置可能ブロック（AIR と みず を除く並び）
export const PLACEABLE_BLOCKS: BlockId[] = [
  BLOCK.GRASS,
  BLOCK.DIRT,
  BLOCK.STONE,
  BLOCK.SAND,
  BLOCK.WOOD,
  BLOCK.LEAVES,
  BLOCK.BRICK,
  BLOCK.RAINBOW,
  BLOCK.GLASS,
  BLOCK.LIGHT,
]

export function getBlock(id: BlockId): BlockType {
  return BLOCKS[id] ?? BLOCKS[0]
}

export function isSolid(id: BlockId): boolean {
  return getBlock(id).solid
}

export function isOpaque(id: BlockId): boolean {
  return getBlock(id).opaque
}

export function isTransparent(id: BlockId): boolean {
  return getBlock(id).transparent
}

export function lightEmission(id: BlockId): number {
  return getBlock(id).emission
}

// faceColors を取り出す（faceDir: 0=+Y上, 1=-Y下, それ以外=側面）
export function faceColor(id: BlockId, faceDir: number): number {
  const b = getBlock(id)
  if (faceDir === 0) return b.colorTop
  if (faceDir === 1) return b.colorBottom
  return b.colorSide
}
