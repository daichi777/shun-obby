// プレイヤー操作をデバッグ層（debug.ts）から叩くための薄いレジストリ。
// VoxelPlayer がマウント時に登録する。

export interface PlayerHandle {
  getPos: () => [number, number, number]
  getEyePos: () => [number, number, number]
  getLookDir: () => [number, number, number]
  getOnGround: () => boolean
  isMoving: () => boolean
  teleport: (x: number, y: number, z: number) => void
}

let handle: PlayerHandle | null = null

export function registerPlayer(h: PlayerHandle): () => void {
  handle = h
  return () => {
    if (handle === h) handle = null
  }
}

export function getPlayer(): PlayerHandle | null {
  return handle
}
