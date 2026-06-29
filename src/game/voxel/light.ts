// ライティングエンジン（block light + sky light の flood-fill/BFS 伝播）。
// 研究の忠実コア: 追加伝播(add) と 撤去伝播(remove・最難所) を両方実装する。
// Starlight 的に「より明るい近傍があれば再充填」を remove 後の re-add で行う。
// 純TS（VoxelWorld に対して動作）。

import { WORLD_MAX_Y, WORLD_SIZE_X, WORLD_SIZE_Z } from './constants'
import { worldToChunkX, worldToChunkZ } from './coords'
import { isOpaque, lightEmission } from './blocks'
import type { VoxelWorld } from './VoxelWorld'

const DIRS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

type Mark = (x: number, z: number) => void
const NO_MARK: Mark = () => {}

interface Node {
  x: number
  y: number
  z: number
  level: number
}

// インクリメンタル更新中に、光が変わったチャンク（+境界隣接）を再メッシュ対象に
function markCellFactory(world: VoxelWorld): Mark {
  return (x: number, z: number) => {
    const cx = worldToChunkX(x)
    const cz = worldToChunkZ(z)
    const lx = x & 15
    const lz = z & 15
    world.markDirty(cx, cz)
    if (lx === 0) world.markDirty(cx - 1, cz)
    if (lx === 15) world.markDirty(cx + 1, cz)
    if (lz === 0) world.markDirty(cx, cz - 1)
    if (lz === 15) world.markDirty(cx, cz + 1)
  }
}

// ===== block light =====

function addBlockBFS(world: VoxelWorld, queue: Node[], mark: Mark): void {
  let head = 0
  while (head < queue.length) {
    const { x, y, z } = queue[head++]
    const level = world.getBlockLight(x, y, z)
    if (level <= 1) continue
    for (const [dx, dy, dz] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      const nz = z + dz
      if (isOpaque(world.getBlock(nx, ny, nz))) continue
      if (world.getBlockLight(nx, ny, nz) + 1 < level) {
        world.setBlockLight(nx, ny, nz, level - 1)
        mark(nx, nz)
        queue.push({ x: nx, y: ny, z: nz, level: level - 1 })
      }
    }
  }
}

// start は呼び出し側で 0 にしてから渡す。level=start の旧値。再充填源を reAdd へ集める。
function removeBlockBFS(
  world: VoxelWorld,
  sx: number,
  sy: number,
  sz: number,
  startLevel: number,
  mark: Mark,
  reAdd: Node[],
): void {
  const q: Node[] = [{ x: sx, y: sy, z: sz, level: startLevel }]
  let head = 0
  while (head < q.length) {
    const { x, y, z, level } = q[head++]
    for (const [dx, dy, dz] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      const nz = z + dz
      const nl = world.getBlockLight(nx, ny, nz)
      if (nl === 0) continue
      if (nl < level) {
        world.setBlockLight(nx, ny, nz, 0)
        mark(nx, nz)
        q.push({ x: nx, y: ny, z: nz, level: nl })
      } else {
        // 独立した（同等以上の）光源 → あとで再充填
        reAdd.push({ x: nx, y: ny, z: nz, level: nl })
      }
    }
  }
}

// ===== sky light =====

function addSkyBFS(world: VoxelWorld, queue: Node[], mark: Mark): void {
  let head = 0
  while (head < queue.length) {
    const { x, y, z } = queue[head++]
    const level = world.getSkyLight(x, y, z)
    if (level <= 0) continue
    for (const [dx, dy, dz] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      const nz = z + dz
      if (isOpaque(world.getBlock(nx, ny, nz))) continue
      // 直下 + 満タン(15) は減衰なし（直射光柱）
      const target = dy === -1 && level === 15 ? 15 : level - 1
      if (target <= 0) continue
      if (world.getSkyLight(nx, ny, nz) < target) {
        world.setSkyLight(nx, ny, nz, target)
        mark(nx, nz)
        queue.push({ x: nx, y: ny, z: nz, level: target })
      }
    }
  }
}

function removeSkyBFS(
  world: VoxelWorld,
  sx: number,
  sy: number,
  sz: number,
  startLevel: number,
  mark: Mark,
  reAdd: Node[],
): void {
  const q: Node[] = [{ x: sx, y: sy, z: sz, level: startLevel }]
  let head = 0
  while (head < q.length) {
    const { x, y, z, level } = q[head++]
    for (const [dx, dy, dz] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      const nz = z + dz
      const nl = world.getSkyLight(nx, ny, nz)
      if (nl === 0) continue
      // 直下へ満タンを配っていた場合、その下の柱(==level)も我々起因 → 撤去
      const downFromFull = dy === -1 && level === 15
      if (nl < level || downFromFull) {
        world.setSkyLight(nx, ny, nz, 0)
        mark(nx, nz)
        q.push({ x: nx, y: ny, z: nz, level: nl })
      } else {
        reAdd.push({ x: nx, y: ny, z: nz, level: nl })
      }
    }
  }
}

// ===== 公開: 初期化 & インクリメンタル =====

// ワールド全体の light を一括計算（worldgen 直後に呼ぶ）。
export function initLight(world: VoxelWorld): void {
  // block light: 発光ブロックを seed
  const blockQ: Node[] = []
  for (const chunk of world.chunks.values()) {
    const ox = chunk.cx << 4
    const oz = chunk.cz << 4
    for (let sy = 0; sy < chunk.sections.length; sy++) {
      const sec = chunk.sections[sy]
      if (!sec || sec.isEmpty()) continue
      const base = sy << 4
      for (let ly = 0; ly < 16; ly++) {
        for (let lz = 0; lz < 16; lz++) {
          for (let lx = 0; lx < 16; lx++) {
            const id = sec.get(lx, ly, lz)
            const e = lightEmission(id)
            if (e > 0) {
              const x = ox + lx
              const y = base + ly
              const z = oz + lz
              world.setBlockLight(x, y, z, e)
              blockQ.push({ x, y, z, level: e })
            }
          }
        }
      }
    }
  }
  addBlockBFS(world, blockQ, NO_MARK)

  // sky light: 各カラムを上から、不透明に当たるまで 15。確保済みセクションのみ格納
  // （地表より上の null セクションは getSkyLight が既定 15 を返すため格納不要）。
  const skyQ: Node[] = []
  for (let x = 0; x < WORLD_SIZE_X; x++) {
    for (let z = 0; z < WORLD_SIZE_Z; z++) {
      const cx = worldToChunkX(x)
      const cz = worldToChunkZ(z)
      const chunk = world.getChunk(cx, cz)
      if (!chunk) continue
      for (let y = WORLD_MAX_Y; y >= 0; y--) {
        if (isOpaque(world.getBlock(x, y, z))) break
        if (chunk.sections[y >> 4]) {
          world.setSkyLight(x, y, z, 15)
          skyQ.push({ x, y, z, level: 15 })
        }
      }
    }
  }
  addSkyBFS(world, skyQ, NO_MARK)
}

// VoxelWorld の setBlock からのインクリメンタル更新を登録する。
export function attachLight(world: VoxelWorld): void {
  const mark = markCellFactory(world)
  world.onBlockChange((x, y, z, _oldId, newId) => {
    const newOpaque = isOpaque(newId)
    const newEmit = lightEmission(newId)

    // --- block light ---
    {
      const reAdd: Node[] = []
      const oldBL = world.getBlockLight(x, y, z)
      if (oldBL > 0) {
        world.setBlockLight(x, y, z, 0)
        mark(x, z)
        removeBlockBFS(world, x, y, z, oldBL, mark, reAdd)
      }
      if (newEmit > 0) {
        world.setBlockLight(x, y, z, newEmit)
        mark(x, z)
        reAdd.push({ x, y, z, level: newEmit })
      }
      if (!newOpaque) {
        // 空気/透明になった: 近傍の光が流れ込む
        for (const [dx, dy, dz] of DIRS) {
          const nl = world.getBlockLight(x + dx, y + dy, z + dz)
          if (nl > 0) reAdd.push({ x: x + dx, y: y + dy, z: z + dz, level: nl })
        }
      }
      if (reAdd.length) addBlockBFS(world, reAdd, mark)
    }

    // --- sky light ---
    {
      const reAdd: Node[] = []
      const oldSky = world.getSkyLight(x, y, z)
      if (oldSky > 0) {
        world.setSkyLight(x, y, z, 0)
        mark(x, z)
        removeSkyBFS(world, x, y, z, oldSky, mark, reAdd)
      }
      if (!newOpaque) {
        for (const [dx, dy, dz] of DIRS) {
          const nl = world.getSkyLight(x + dx, y + dy, z + dz)
          if (nl > 0) reAdd.push({ x: x + dx, y: y + dy, z: z + dz, level: nl })
        }
      }
      if (reAdd.length) addSkyBFS(world, reAdd, mark)
    }
  })
}
