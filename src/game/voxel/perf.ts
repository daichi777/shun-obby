// 計測の単一レジストリ（§3.0 計測契約）。
// - fps / drawCalls: 描画ループ（VoxelChunks の useFrame）が更新
// - tris / totalVertices / meshedChunks: ChunkMeshManager が再メッシュ時に更新
// - remeshCount: 累積再メッシュ回数（「この操作で再メッシュが起きたか」を差分検証するため）

interface PerfState {
  fps: number
  drawCalls: number
  tris: number
  totalVertices: number
  meshedChunks: number
  remeshCount: number
}

const state: PerfState = {
  fps: 0,
  drawCalls: 0,
  tris: 0,
  totalVertices: 0,
  meshedChunks: 0,
  remeshCount: 0,
}

// 再メッシュ待ちチャンク（waitForMeshIdle の判定源）。レンダラが毎フレーム更新する。
let dirtyKeys: string[] = []
export function setDirtyChunks(keys: string[]): void {
  dirtyKeys = keys
}
export function getDirtyChunks(): string[] {
  return dirtyKeys
}
export function getDirtyCount(): number {
  return dirtyKeys.length
}

export function setFps(v: number): void {
  state.fps = v
}
export function getFps(): number {
  return state.fps
}
export function setDrawCalls(v: number): void {
  state.drawCalls = v
}
export function setMeshTotals(tris: number, vertices: number, meshedChunks: number): void {
  state.tris = tris
  state.totalVertices = vertices
  state.meshedChunks = meshedChunks
}
export function incRemesh(n = 1): void {
  state.remeshCount += n
}
export function getPerf(): Readonly<PerfState> {
  return state
}

export function heapUsed(): number | null {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory
  return mem?.usedJSHeapSize ?? null
}
