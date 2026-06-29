// 手続き的に生成するピクセルアート・テクスチャアトラス。
// 外部画像は使わず（著作権回避・子供向けに自前アート）、1タイル=16×16px の絵をコードで描く。
// - 純粋部分（タイル定数・UV計算・ブロック→タイル対応・paintAtlas(ctx)）はどこからでも import 可。
// - 実際の canvas / THREE.Texture 生成は ChunkRenderer 側（ブラウザ実行時）が行う。

import { BLOCK, type BlockId } from './blocks'

export const TILE = 16 // 1タイルの解像度（本家と同じ16px）
export const ATLAS_COLS = 4
export const ATLAS_ROWS = 4
export const ATLAS_PX = ATLAS_COLS * TILE // 64

// タイル番号（アトラス内の位置 = index）
export const TEX = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD_TOP: 5,
  WOOD_SIDE: 6,
  LEAVES: 7,
  BRICK: 8,
  RAINBOW: 9,
  GLASS: 10,
  CLOUD: 11,
  WATER: 12,
  LIGHT: 13,
} as const

// faceKind: 0=上(+Y) / 1=下(-Y) / 2=側面
type FaceKind = 0 | 1 | 2

// ブロック × 面 → タイル番号
export function blockFaceTile(id: BlockId, kind: FaceKind): number {
  switch (id) {
    case BLOCK.GRASS:
      return kind === 0 ? TEX.GRASS_TOP : kind === 1 ? TEX.DIRT : TEX.GRASS_SIDE
    case BLOCK.DIRT:
      return TEX.DIRT
    case BLOCK.STONE:
      return TEX.STONE
    case BLOCK.SAND:
      return TEX.SAND
    case BLOCK.WATER:
      return TEX.WATER
    case BLOCK.WOOD:
      return kind === 2 ? TEX.WOOD_SIDE : TEX.WOOD_TOP
    case BLOCK.LEAVES:
      return TEX.LEAVES
    case BLOCK.BRICK:
      return TEX.BRICK
    case BLOCK.RAINBOW:
      return TEX.RAINBOW
    case BLOCK.GLASS:
      return TEX.GLASS
    case BLOCK.CLOUD:
      return TEX.CLOUD
    case BLOCK.LIGHT:
      return TEX.LIGHT
    default:
      return TEX.STONE
  }
}

// タイル番号 → アトラス内 UV 矩形（half-texel inset で隣タイルへのにじみを防ぐ）。
// v は「テクスチャ上端 = v0」で扱う（ChunkRenderer 側で flipY=false にする）。
const EPS = 0.5 / ATLAS_PX
export function tileUV(index: number): { u0: number; v0: number; u1: number; v1: number } {
  const col = index % ATLAS_COLS
  const row = Math.floor(index / ATLAS_COLS)
  const u0 = (col * TILE) / ATLAS_PX + EPS
  const u1 = ((col + 1) * TILE) / ATLAS_PX - EPS
  const v0 = (row * TILE) / ATLAS_PX + EPS
  const v1 = ((row + 1) * TILE) / ATLAS_PX - EPS
  return { u0, v0, u1, v1 }
}

// ===== 以下、描画（CanvasRenderingContext2D を受け取る純粋ロジック） =====

// 決定論ノイズ（タイル内ピクセルの粒立て用）
function rnd(x: number, y: number, s: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// CanvasRenderingContext2D の必要分だけ受ける（DOM型と互換にするため fillStyle は union）。
interface Ctx {
  fillStyle: string | CanvasGradient | CanvasPattern
  fillRect: (x: number, y: number, w: number, h: number) => void
}

function setPx(ctx: Ctx, ox: number, oy: number, x: number, y: number, r: number, g: number, b: number, a = 1): void {
  ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`
  ctx.fillRect(ox + x, oy + y, 1, 1)
}

function hueToRgb(h: number): [number, number, number] {
  // h: 0..1, s=1, l=0.6
  const s = 0.85
  const l = 0.62
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h * 6
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const m = l - c / 2
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

// 各タイルの描画関数（16×16）
function paintTile(ctx: Ctx, index: number, ox: number, oy: number): void {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      let r = 128
      let g = 128
      let b = 128
      const n = rnd(x, y, index + 1)

      switch (index) {
        case TEX.GRASS_TOP: {
          const k = 0.9 + n * 0.2
          r = 106 * k
          g = 190 * k
          b = 48 * k
          if (n < 0.08) {
            r *= 0.8
            g *= 0.82
            b *= 0.8
          }
          break
        }
        case TEX.DIRT: {
          const k = 0.85 + n * 0.25
          r = 122 * k
          g = 91 * k
          b = 58 * k
          if (n < 0.1) {
            r *= 0.75
            g *= 0.75
            b *= 0.7
          } else if (n > 0.94) {
            r = Math.min(255, r * 1.15)
            g = Math.min(255, g * 1.15)
            b = Math.min(255, b * 1.15)
          }
          break
        }
        case TEX.GRASS_SIDE: {
          // 下は土、上数pxは草。境界をギザギザに。
          const grassDepth = 4 + (rnd(x, 0, 77) < 0.5 ? 1 : 0)
          if (y < grassDepth) {
            const k = 0.9 + rnd(x, y, 3) * 0.2
            r = 96 * k
            g = 176 * k
            b = 46 * k
          } else {
            const k = 0.85 + rnd(x, y, 2) * 0.25
            r = 122 * k
            g = 91 * k
            b = 58 * k
            if (rnd(x, y, 9) < 0.1) {
              r *= 0.78
              g *= 0.78
              b *= 0.73
            }
          }
          break
        }
        case TEX.STONE: {
          const k = 0.9 + n * 0.16
          r = 130 * k
          g = 130 * k
          b = 132 * k
          // ヒビ
          if (rnd(x, y, 31) < 0.05) {
            r *= 0.68
            g *= 0.68
            b *= 0.7
          }
          break
        }
        case TEX.SAND: {
          const k = 0.95 + n * 0.1
          r = 230 * k
          g = 213 * k
          b = 154 * k
          break
        }
        case TEX.WOOD_TOP: {
          const cx = 7.5
          const cy = 7.5
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
          const ring = Math.round(d) % 2 === 0 ? 1 : 0.85
          r = 150 * ring
          g = 120 * ring
          b = 70 * ring
          break
        }
        case TEX.WOOD_SIDE: {
          const col = 0.85 + rnd(x, 0, 17) * 0.25
          r = 110 * col
          g = 79 * col
          b = 46 * col
          // たて木目
          if (x % 4 === 0) {
            r *= 0.82
            g *= 0.82
            b *= 0.82
          }
          // 節
          if ((x - 5) ** 2 + (y - 9) ** 2 < 3) {
            r *= 0.6
            g *= 0.6
            b *= 0.6
          }
          break
        }
        case TEX.LEAVES: {
          const k = 0.8 + n * 0.3
          r = 79 * k
          g = 168 * k
          b = 58 * k
          if (n < 0.12) {
            // すきま（暗い）
            r *= 0.55
            g *= 0.6
            b *= 0.5
          }
          break
        }
        case TEX.BRICK: {
          const brickH = 4
          const brickW = 8
          const row = Math.floor(y / brickH)
          const offset = row % 2 === 0 ? 0 : brickW / 2
          const inMortarY = y % brickH === 0
          const inMortarX = (x + offset) % brickW === 0
          if (inMortarY || inMortarX) {
            r = 205
            g = 195
            b = 185
          } else {
            const k = 0.9 + rnd(x, y, 5) * 0.18
            r = 174 * k
            g = 90 * k
            b = 63 * k
          }
          break
        }
        case TEX.RAINBOW: {
          const band = Math.floor((y / TILE) * 7)
          const [rr, gg, bb] = hueToRgb(band / 7)
          const k = 0.92 + rnd(x, y, 13) * 0.12
          r = rr * k
          g = gg * k
          b = bb * k
          break
        }
        case TEX.GLASS: {
          // ふち＋ガラス面（うすい水色）。透過はマテリアル opacity で表現。
          const border = x === 0 || y === 0 || x === TILE - 1 || y === TILE - 1
          if (border) {
            r = 210
            g = 240
            b = 255
          } else {
            r = 191
            g = 230
            b = 255
            // 斜めの光沢
            if (x - y === 3 || x - y === 4) {
              r = 240
              g = 250
              b = 255
            }
          }
          break
        }
        case TEX.CLOUD: {
          r = 250
          g = 252
          b = 255
          if (n < 0.12) {
            r *= 0.96
            g *= 0.97
            b *= 0.98
          }
          break
        }
        case TEX.WATER: {
          const k = 0.92 + rnd(x, y, 23) * 0.12
          r = 58 * k
          g = 123 * k
          b = 230 * k
          // よこ波
          if (y % 4 === 0) {
            r = Math.min(255, r * 1.18)
            g = Math.min(255, g * 1.12)
            b = Math.min(255, b * 1.05)
          }
          break
        }
        case TEX.LIGHT: {
          const cx = 7.5
          const cy = 7.5
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / 9
          r = 255
          g = 250 - d * 60
          b = 210 - d * 150
          if (n > 0.93) {
            // きらめき
            r = 255
            g = 255
            b = 235
          }
          break
        }
        default:
          break
      }
      setPx(ctx, ox, oy, x, y, r, g, b, 1)
    }
  }
}

// アトラス全体を 2D コンテキストへ描画する（ctx は ATLAS_PX×ATLAS_PX の canvas のもの）。
export function paintAtlas(ctx: Ctx): void {
  for (let i = 0; i < ATLAS_COLS * ATLAS_ROWS; i++) {
    const col = i % ATLAS_COLS
    const row = Math.floor(i / ATLAS_COLS)
    paintTile(ctx, i, col * TILE, row * TILE)
  }
}
