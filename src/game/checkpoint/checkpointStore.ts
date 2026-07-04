import { create } from 'zustand'

// 「ここから復活」の登録先。触れたチェックポイントを1つだけ覚える。
// 復帰の実処理（落下検知＆テレポート）は Player.tsx が毎フレーム行う。
export interface ActiveCheckpoint {
  id: number
  x: number
  y: number // パッド天面の高さ（復帰先はこの少し上）
  z: number
  r: number // 着地キャッチ半径（水平）。この内で芝生に落ちたら復帰、外なら解除。
}

interface CheckpointState {
  active: ActiveCheckpoint | null
  set: (cp: ActiveCheckpoint) => void
  clear: () => void
  reset: () => void
}

export const useCheckpoint = create<CheckpointState>((set) => ({
  active: null,
  set: (cp) => set({ active: cp }),
  clear: () => set({ active: null }),
  reset: () => set({ active: null }),
}))

// チェックポイントごとの一意ID（同じパッドの再発火を防ぐため）。
let cpSeq = 0
export const nextCheckpointId = () => ++cpSeq
