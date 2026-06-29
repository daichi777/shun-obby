// ワールドの単一権威ソース（研究 §4.2「内部権威モデル」の萌芽）。
// setBlock がブロック変更の唯一の書き込み口。変更時に dirty チャンクを記録し listener へ通知する。
// Three 非依存（純TS）。

import {
  WORLD_CHUNKS_X,
  WORLD_CHUNKS_Z,
  WORLD_MIN_X,
  WORLD_MIN_Z,
  WORLD_MAX_X,
  WORLD_MAX_Z,
  WORLD_MIN_Y,
  WORLD_MAX_Y,
  DEFAULT_SEED,
} from './constants'
import { worldToChunkX, worldToChunkZ, worldToLocalX, worldToLocalZ, chunkKey } from './coords'
import { Chunk } from './Chunk'
import { Section } from './Section'
import { AIR, type BlockId, isSolid as blockIsSolid } from './blocks'

export type DirtyListener = (cx: number, cz: number) => void

export class VoxelWorld {
  readonly chunks = new Map<string, Chunk>()
  seed: number
  // 今ロードされているチャンク範囲（固定 8x8）
  readonly minCX = 0
  readonly maxCX = WORLD_CHUNKS_X - 1
  readonly minCZ = 0
  readonly maxCZ = WORLD_CHUNKS_Z - 1

  private listeners = new Set<DirtyListener>()
  // ブロック変更ハンドラ（ライティング更新フック。1つだけ）
  private blockChangeHandler: ((x: number, y: number, z: number, oldId: BlockId, newId: BlockId) => void) | null = null
  // 変更回数（store の再描画トリガ用カウンタ）
  revision = 0

  constructor(seed: number = DEFAULT_SEED) {
    this.seed = seed
  }

  inBounds(x: number, y: number, z: number): boolean {
    return (
      x >= WORLD_MIN_X &&
      x <= WORLD_MAX_X &&
      z >= WORLD_MIN_Z &&
      z <= WORLD_MAX_Z &&
      y >= WORLD_MIN_Y &&
      y <= WORLD_MAX_Y
    )
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cz))
  }

  getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = chunkKey(cx, cz)
    let c = this.chunks.get(key)
    if (!c) {
      c = new Chunk(cx, cz)
      this.chunks.set(key, c)
    }
    return c
  }

  getBlock(x: number, y: number, z: number): BlockId {
    if (y < WORLD_MIN_Y || y > WORLD_MAX_Y) return AIR
    const c = this.getChunk(worldToChunkX(x), worldToChunkZ(z))
    if (!c) return AIR
    return c.getBlock(worldToLocalX(x), y, worldToLocalZ(z))
  }

  isSolid(x: number, y: number, z: number): boolean {
    return blockIsSolid(this.getBlock(x, y, z))
  }

  onBlockChange(h: (x: number, y: number, z: number, oldId: BlockId, newId: BlockId) => void): void {
    this.blockChangeHandler = h
  }

  // 唯一の書き込み口。変更があったら true を返し dirty 通知する。
  // silent=true のときは listener/ライティングを呼ばない（ワールド一括生成中のバッチ用）。
  setBlock(x: number, y: number, z: number, id: BlockId, silent = false): boolean {
    if (!this.inBounds(x, y, z)) return false
    const oldId = this.getBlock(x, y, z)
    if (oldId === id) return false
    const cx = worldToChunkX(x)
    const cz = worldToChunkZ(z)
    const lx = worldToLocalX(x)
    const lz = worldToLocalZ(z)
    const chunk = this.getOrCreateChunk(cx, cz)
    const changed = chunk.setBlock(lx, y, lz, id)
    if (!changed) return false

    this.revision++
    if (!silent) {
      // ライティング更新（光が変わったチャンクは内部で markDirty される）
      if (this.blockChangeHandler) this.blockChangeHandler(x, y, z, oldId, id)
      this.markDirty(cx, cz)
      // 境界 voxel の変更は隣接チャンクのメッシュにも影響する
      if (lx === 0) this.markDirty(cx - 1, cz)
      if (lx === 15) this.markDirty(cx + 1, cz)
      if (lz === 0) this.markDirty(cx, cz - 1)
      if (lz === 15) this.markDirty(cx, cz + 1)
    }
    return changed
  }

  // --- ライティングアクセサ ---
  // 範囲外/未ロード/空セクション（地表より上の空気）は sky=15 を返す。
  getSkyLight(x: number, y: number, z: number): number {
    if (y > WORLD_MAX_Y) return 15
    if (y < WORLD_MIN_Y) return 0
    const c = this.getChunk(worldToChunkX(x), worldToChunkZ(z))
    if (!c) return 15
    const sy = y >> 4
    const sec = c.sections[sy]
    if (!sec) return 15
    return sec.getSkyLight(worldToLocalX(x), y & 15, worldToLocalZ(z))
  }

  getBlockLight(x: number, y: number, z: number): number {
    if (y < WORLD_MIN_Y || y > WORLD_MAX_Y) return 0
    const c = this.getChunk(worldToChunkX(x), worldToChunkZ(z))
    if (!c) return 0
    const sec = c.sections[y >> 4]
    if (!sec) return 0
    return sec.getBlockLight(worldToLocalX(x), y & 15, worldToLocalZ(z))
  }

  // 光を書き込む（必要ならセクションを確保）。値が変わったら true。
  private sectionForLight(x: number, y: number, z: number): Section | null {
    if (y < WORLD_MIN_Y || y > WORLD_MAX_Y) return null
    const c = this.getOrCreateChunk(worldToChunkX(x), worldToChunkZ(z))
    const sy = y >> 4
    let sec = c.sections[sy]
    if (!sec) {
      sec = new Section()
      c.sections[sy] = sec
    }
    return sec
  }

  setSkyLight(x: number, y: number, z: number, v: number): boolean {
    const sec = this.sectionForLight(x, y, z)
    if (!sec) return false
    const lx = worldToLocalX(x)
    const ly = y & 15
    const lz = worldToLocalZ(z)
    if (sec.getSkyLight(lx, ly, lz) === v) return false
    sec.setSkyLight(lx, ly, lz, v)
    return true
  }

  setBlockLight(x: number, y: number, z: number, v: number): boolean {
    const sec = this.sectionForLight(x, y, z)
    if (!sec) return false
    const lx = worldToLocalX(x)
    const ly = y & 15
    const lz = worldToLocalZ(z)
    if (sec.getBlockLight(lx, ly, lz) === v) return false
    sec.setBlockLight(lx, ly, lz, v)
    return true
  }

  // dirty チャンクを記録し listener へ通知（存在するチャンクのみ）。
  markDirty(cx: number, cz: number): void {
    const c = this.getChunk(cx, cz)
    if (!c) return
    c.meshDirty = true
    for (const l of this.listeners) l(cx, cz)
  }

  // 全ロード済みチャンクを dirty に（生成・リセット直後の一括メッシュ用）。
  markAllDirty(): void {
    for (const c of this.chunks.values()) {
      c.meshDirty = true
      this.listeners.forEach((l) => l(c.cx, c.cz))
    }
  }

  onDirty(l: DirtyListener): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  // 非 AIR ブロック総数
  count(): number {
    let n = 0
    for (const c of this.chunks.values()) n += c.nonAirCount()
    return n
  }
}
