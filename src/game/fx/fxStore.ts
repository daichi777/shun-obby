import { create } from 'zustand'

// キラキラ（パーティクル）の発火を、Canvasの外（store/UI）からも呼べるようにする小さなストア。
export interface Burst {
  id: number
  pos: [number, number, number]
  color: string
  born: number // performance.now()
}

interface FxState {
  bursts: Burst[]
  burst: (pos: [number, number, number], color?: string) => void
  remove: (id: number) => void
}

let fxId = 0
const now = () => (typeof performance !== 'undefined' ? performance.now() : 0)

export const useFx = create<FxState>((set) => ({
  bursts: [],
  burst: (pos, color = '#ffe14d') =>
    set((s) => ({ bursts: [...s.bursts, { id: ++fxId, pos, color, born: now() }] })),
  remove: (id) => set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })),
}))

// 外部（zustand外）から手軽に呼ぶヘルパー
export const sparkleAt = (pos: [number, number, number], color?: string) =>
  useFx.getState().burst(pos, color)
