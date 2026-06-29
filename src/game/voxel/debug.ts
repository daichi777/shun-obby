// Playwright 自動プレイテスト用デバッグフック（§3）。
// 権威ストア（VoxelWorld）に薄い adapter をかぶせ window.__game.voxel を増設する。
// 既存 window.__game（getState/teleport/build.*）のマージ規約を踏襲し上書きしない。

import { useVoxel } from './voxelStore'
import { getPlayer } from './playerRegistry'
import { generateWorld } from './worldgen'
import { initLight } from './light'
import { raycastVoxel } from './raycast'
import { lightToFactor } from './mesher'
import { placeBlock, breakBlock } from './VoxelInteraction'
import { getPerf, getFps, getDirtyChunks, getDirtyCount, heapUsed } from './perf'
import { REACH, SECTION, WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Y, WORLD_MAX_Y, WORLD_MIN_Z, WORLD_MAX_Z } from './constants'
import { worldToChunkX, worldToChunkZ } from './coords'
import type { BlockId } from './blocks'
import type { ChunkStats, RaycastHit, VoxelDebugAPI, WorldInfo } from './debugTypes'

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

function getChunkStats(): ChunkStats {
  const world = useVoxel.getState().world
  const perf = getPerf()
  let sections = 0
  for (const c of world.chunks.values()) sections += c.liveSectionCount()
  return {
    loaded: world.chunks.size,
    meshed: perf.meshedChunks,
    dirty: getDirtyCount(),
    tris: perf.tris,
    totalVertices: perf.totalVertices,
    drawCalls: perf.drawCalls,
    sections,
    remeshCount: perf.remeshCount,
    blocks: world.count(),
    heapUsed: heapUsed(),
  }
}

function getWorldInfo(): WorldInfo {
  const world = useVoxel.getState().world
  return {
    chunkSize: SECTION,
    sectionSize: SECTION,
    worldBounds: {
      minX: WORLD_MIN_X,
      maxX: WORLD_MAX_X,
      minY: WORLD_MIN_Y,
      maxY: WORLD_MAX_Y,
      minZ: WORLD_MIN_Z,
      maxZ: WORLD_MAX_Z,
    },
    seed: world.seed,
  }
}

function doRaycast(origin?: [number, number, number], dir?: [number, number, number]): RaycastHit {
  const world = useVoxel.getState().world
  const p = getPlayer()
  const o = origin ?? p?.getEyePos() ?? [0, 0, 0]
  const d = dir ?? p?.getLookDir() ?? [0, -1, 0]
  const r = raycastVoxel(o[0], o[1], o[2], d[0], d[1], d[2], REACH, (x, y, z) => world.isSolid(x, y, z))
  return {
    hit: r.hit,
    block: r.cell ? world.getBlock(r.cell[0], r.cell[1], r.cell[2]) : 0,
    cell: r.cell,
    prev: r.prev,
    normal: r.normal,
    distance: r.distance,
  }
}

// face shade: メッシャと同じ計算（faceDir 0=+Y上,1=-Y下,2..側面）。
// 指定セルの faceDir 側に隣接する露出セルの光を採用する。
const FACE_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 0], // 0 +Y
  [0, -1, 0], // 1 -Y
  [0, 0, -1], // 2 -Z
  [0, 0, 1], // 3 +Z
  [-1, 0, 0], // 4 -X
  [1, 0, 0], // 5 +X
]
const FACE_SHADE = [1.0, 0.55, 0.7, 0.8, 0.62, 0.88]

function getFaceShade(x: number, y: number, z: number, faceDir: number): number {
  const w = useVoxel.getState().world
  const off = FACE_OFFSETS[faceDir] ?? FACE_OFFSETS[0]
  const nx = x + off[0]
  const ny = y + off[1]
  const nz = z + off[2]
  const level = Math.max(w.getSkyLight(nx, ny, nz), w.getBlockLight(nx, ny, nz))
  return lightToFactor(level) * (FACE_SHADE[faceDir] ?? 1)
}

// ライティングは setBlock 内で同期 BFS 完了する。1フレーム待って再メッシュの反映を待つ。
async function waitForLightIdle(timeoutMs = 5000): Promise<boolean> {
  return waitForMeshIdle(timeoutMs)
}

async function waitForMeshIdle(timeoutMs = 5000): Promise<boolean> {
  // setBlock 直後の dirty が perf へ反映されるまで1フレーム待つ
  await frame()
  const start = performance.now()
  while (getDirtyCount() > 0) {
    if (performance.now() - start > timeoutMs) return false
    await frame()
  }
  // tris 等の totals 確定のため もう1フレーム
  await frame()
  return true
}

export function setupVoxelDebug(): void {
  const api: VoxelDebugAPI = {
    getBlock: (x, y, z) => useVoxel.getState().world.getBlock(x, y, z),
    getChunkStats,
    getFps,
    getWorldInfo,
    getPalette: (cx, cy, sy) => {
      const world = useVoxel.getState().world
      const chunk = world.getChunk(cx, cy)
      const sec = chunk?.sections[sy]
      return sec ? [...sec.palette] : []
    },
    count: () => useVoxel.getState().world.count(),
    raycastVoxel: doRaycast,
    setBlock: (x, y, z, id) => useVoxel.getState().world.setBlock(x, y, z, id),
    placeBlock: (cell, id) => placeBlock(useVoxel.getState().world, cell, id),
    breakBlock: (x, y, z) => breakBlock(useVoxel.getState().world, x, y, z),
    waitForMeshIdle,
    getLight: (x, y, z) => {
      const w = useVoxel.getState().world
      return { block: w.getBlockLight(x, y, z), sky: w.getSkyLight(x, y, z) }
    },
    getFaceShade,
    waitForLightIdle,
    selectBlock: (id: BlockId) => useVoxel.getState().selectBlock(id),
    getSelected: () => useVoxel.getState().selectedBlockId,
    setTool: (t) => useVoxel.getState().setTool(t),
    setFly: (on) => useVoxel.getState().setFly(on),
    resetWorld: () => {
      const w = useVoxel.getState().world
      generateWorld(w)
      initLight(w)
      w.markAllDirty()
    },
    loadSeed: (seed) => {
      const w = useVoxel.getState().world
      generateWorld(w, seed)
      initLight(w)
      w.markAllDirty()
    },
    dirtyChunks: () => getDirtyChunks(),
  }

  // プレイヤー状態（既存 getState/teleport 規約に合わせ top-level にも露出）
  const getState = () => {
    const p = getPlayer()
    const stats = getChunkStats()
    return {
      playerPos: p ? p.getPos() : null,
      eyePos: p ? p.getEyePos() : null,
      lookDir: p ? p.getLookDir() : null,
      isOnGround: p ? p.getOnGround() : null,
      isMoving: p ? p.isMoving() : null,
      fps: getFps(),
      blocks: stats.blocks,
      dirty: stats.dirty,
    }
  }
  const teleport = (x: number, y: number, z: number) => getPlayer()?.teleport(x, y, z)

  const w = window as unknown as { __game?: Record<string, unknown> }
  w.__game = { ...(w.__game ?? {}), voxel: api, getState, teleport }
  // チャンク座標ヘルパも（テストの可読性向上）
  ;(w.__game as Record<string, unknown>).toChunk = (x: number, z: number) => [worldToChunkX(x), worldToChunkZ(z)]
}
