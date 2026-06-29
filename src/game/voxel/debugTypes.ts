// window.__game.voxel に露出するデバッグ API の型契約（S0 凍結・any 禁止）。
// Playwright 自動テストはこの型の経路だけを叩く（テスト専用の別状態を作らない）。

import type { BlockId } from './blocks'

export interface ChunkStats {
  loaded: number // ロード済みチャンク数
  meshed: number // メッシュを持つチャンク数
  dirty: number // 再メッシュ待ちチャンク数
  tris: number // 全メッシュの三角形総数（自前合算・gl.info非依存）
  totalVertices: number
  drawCalls: number // gl.info.render.calls（autoReset=false で1フレームキャプチャ）
  sections: number // 確保済み（非null）セクション総数
  remeshCount: number // 累積再メッシュ回数
  blocks: number // 非 AIR ブロック総数
  heapUsed: number | null
}

export interface RaycastHit {
  hit: boolean
  block: BlockId // 当たったブロック
  cell: [number, number, number] | null // 当たったブロックのセル
  prev: [number, number, number] | null // その手前のセル（設置先）
  normal: [number, number, number] | null
  distance: number
}

export interface WorldInfo {
  chunkSize: number
  sectionSize: number
  worldBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
  seed: number
}

export interface VoxelDebugAPI {
  // 読み取り（同期・権威ストア直読み）
  getBlock: (x: number, y: number, z: number) => BlockId
  getChunkStats: () => ChunkStats
  getFps: () => number
  getWorldInfo: () => WorldInfo
  getPalette: (cx: number, cz: number, sy: number) => BlockId[]
  count: () => number
  // レイキャスト（引数なし＝画面中央/照準前方）
  raycastVoxel: (origin?: [number, number, number], dir?: [number, number, number]) => RaycastHit
  // 書き込み
  setBlock: (x: number, y: number, z: number, id: BlockId) => boolean
  placeBlock: (cell: [number, number, number], id: BlockId) => boolean
  breakBlock: (x: number, y: number, z: number) => boolean
  // ライティング
  getLight: (x: number, y: number, z: number) => { block: number; sky: number }
  getFaceShade: (x: number, y: number, z: number, faceDir: number) => number
  // 非同期完了待ち
  waitForMeshIdle: (timeoutMs?: number) => Promise<boolean>
  waitForLightIdle: (timeoutMs?: number) => Promise<boolean>
  // 補助・決定性
  selectBlock: (id: BlockId) => void
  getSelected: () => BlockId
  setTool: (t: 'place' | 'break') => void
  setFly: (on: boolean) => void
  resetWorld: () => void
  loadSeed: (seed: number) => void
  dirtyChunks: () => string[]
}
