// 決定論的な手続き地形生成（S5）。Math.random は使わず seed ハッシュのみ（同一 seed で同一結果）。
// 研究の忠実コア「高さ場 + 充填」をシンプルな value-noise fBm で代替（density function 群は後回し）。
// 子供向け: なだらかな丘・砂浜・水たまり・木。無限生成はしない（固定 8x8 チャンク）。

import {
  WORLD_SIZE_X,
  WORLD_SIZE_Z,
  WORLD_HEIGHT,
  SEA_LEVEL,
} from './constants'
import { BLOCK, AIR } from './blocks'
import type { VoxelWorld } from './VoxelWorld'

// 32bit 整数ハッシュ -> [0,1)
function hash2(ix: number, iz: number, seed: number): number {
  let h = (ix | 0) * 374761393 + (iz | 0) * 668265263 + (seed | 0) * 1274126177
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h = h ^ (h >>> 16)
  return (h >>> 0) / 4294967296
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

// 2D value noise（格子点をハッシュし bilinear + smoothstep 補間）
function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const fx = smooth(x - x0)
  const fz = smooth(z - z0)
  const v00 = hash2(x0, z0, seed)
  const v10 = hash2(x0 + 1, z0, seed)
  const v01 = hash2(x0, z0 + 1, seed)
  const v11 = hash2(x0 + 1, z0 + 1, seed)
  const a = v00 + (v10 - v00) * fx
  const b = v01 + (v11 - v01) * fx
  return a + (b - a) * fz
}

// fBm（複数オクターブの加算）-> [0,1) 付近
function fbm(x: number, z: number, seed: number): number {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < 4; o++) {
    sum += valueNoise(x * freq, z * freq, seed + o * 1013) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

function heightAt(x: number, z: number, seed: number): number {
  // 大きな起伏 + 細かい起伏
  const base = fbm(x / 48, z / 48, seed)
  const detail = fbm(x / 14, z / 14, seed + 7777) * 0.35
  const n = base + detail
  const h = Math.floor(SEA_LEVEL - 3 + n * 22)
  return Math.max(1, Math.min(WORLD_HEIGHT - 8, h))
}

// 木を1本生やす（幹 + 葉の塊）。決定論的。
function placeTree(world: VoxelWorld, x: number, groundTop: number, z: number): void {
  const trunkH = 4
  const topY = groundTop + trunkH
  for (let y = groundTop + 1; y <= topY; y++) world.setBlock(x, y, z, BLOCK.WOOD, true)
  // 葉: 上部を球状に
  for (let dy = -2; dy <= 1; dy++) {
    const r = dy <= 0 ? 2 : 1
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy < 0) continue // 幹を残す
        if (Math.abs(dx) === r && Math.abs(dz) === r && dy >= 0) continue // 角を落とす
        const ly = topY + dy
        if (world.getBlock(x + dx, ly, z + dz) === AIR) {
          world.setBlock(x + dx, ly, z + dz, BLOCK.LEAVES, true)
        }
      }
    }
  }
}

// ワールド全体を生成する。silent=true で setBlock し、最後に markAllDirty で一括メッシュさせる。
export function generateWorld(world: VoxelWorld, seed: number = world.seed): void {
  world.seed = seed
  world.chunks.clear()

  for (let x = 0; x < WORLD_SIZE_X; x++) {
    for (let z = 0; z < WORLD_SIZE_Z; z++) {
      const h = heightAt(x, z, seed)
      const nearWater = h <= SEA_LEVEL + 1
      for (let y = 0; y <= h; y++) {
        let block: number
        if (y < h - 3) block = BLOCK.STONE
        else if (y < h) block = nearWater ? BLOCK.SAND : BLOCK.DIRT
        else block = nearWater ? BLOCK.SAND : BLOCK.GRASS // 表層
        world.setBlock(x, y, z, block, true)
      }
      // 海面まで水で満たす
      for (let y = h + 1; y <= SEA_LEVEL; y++) {
        world.setBlock(x, y, z, BLOCK.WATER, true)
      }
    }
  }

  // 木（grass の上だけ・等間隔グリッド + ハッシュ判定で自然に散らす）
  for (let x = 4; x < WORLD_SIZE_X - 4; x += 1) {
    for (let z = 4; z < WORLD_SIZE_Z - 4; z += 1) {
      if (hash2(x, z, seed + 4242) < 0.012) {
        const h = heightAt(x, z, seed)
        if (h > SEA_LEVEL + 1 && world.getBlock(x, h, z) === BLOCK.GRASS) {
          placeTree(world, x, h, z)
        }
      }
    }
  }

  world.markAllDirty()
}

// プレイヤーの安全なスポーン地点（ワールド中央の地表上）。
export function spawnPoint(world: VoxelWorld): [number, number, number] {
  const x = Math.floor(WORLD_SIZE_X / 2)
  const z = Math.floor(WORLD_SIZE_Z / 2)
  for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
    if (world.isSolid(x, y, z)) {
      return [x + 0.5, y + 3, z + 0.5]
    }
  }
  return [x + 0.5, WORLD_HEIGHT, z + 0.5]
}
