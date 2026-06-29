import { create } from 'zustand'

// ゲーム全体のじょうたい（コインのかず など）。
// Canvas の中（コイン）からも外（HUD）からも参照するため zustand で共有する。
interface GameState {
  coins: number
  totalCoins: number
  collect: () => void
  addCoins: (n: number) => void
  spend: (n: number) => boolean
  setTotal: (n: number) => void
  reset: () => void
}

export const useGame = create<GameState>((set, get) => ({
  coins: 0,
  totalCoins: 0,
  collect: () => set((s) => ({ coins: s.coins + 1 })),
  addCoins: (n) => set((s) => ({ coins: s.coins + n })),
  spend: (n) => {
    if (get().coins < n) return false
    set((s) => ({ coins: s.coins - n }))
    return true
  },
  setTotal: (n) => set({ totalCoins: n }),
  reset: () => set({ coins: 0 }),
}))
