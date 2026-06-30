import { create } from 'zustand'

// ゲーム全体のじょうたい（コインのかず・レベル など）。
// Canvas の中（コイン）からも外（HUD）からも参照するため zustand で共有する。
interface GameState {
  coins: number // いま持っているコイン（つかうと減る）
  totalCoins: number // ステージ上のコイン総数（進捗表示用）
  lifetimeCoins: number // これまで集めた累計（レベル・クエスト用。減らない）
  level: number // 累計コインから決まるレベル
  boost: number // レベルに応じたブースト（%表示・演出用）
  collect: () => void
  addCoins: (n: number) => void
  spend: (n: number) => boolean
  setTotal: (n: number) => void
  setLifetime: (n: number) => void // 保存データからの復元用
  reset: () => void
}

// 累計コイン → レベル / ブースト
const levelFor = (lifetime: number): number => 1 + Math.floor(lifetime / 12)
const boostFor = (level: number): number => (level - 1) * 5

export const useGame = create<GameState>((set, get) => ({
  coins: 0,
  totalCoins: 0,
  lifetimeCoins: 0,
  level: 1,
  boost: 0,
  collect: () =>
    set((s) => {
      const lifetimeCoins = s.lifetimeCoins + 1
      const level = levelFor(lifetimeCoins)
      return { coins: s.coins + 1, lifetimeCoins, level, boost: boostFor(level) }
    }),
  addCoins: (n) => set((s) => ({ coins: s.coins + n })),
  spend: (n) => {
    if (get().coins < n) return false
    set((s) => ({ coins: s.coins - n }))
    return true
  },
  setTotal: (n) => set({ totalCoins: n }),
  setLifetime: (n) =>
    set(() => {
      const level = levelFor(n)
      return { lifetimeCoins: n, level, boost: boostFor(level) }
    }),
  reset: () => set({ coins: 0, lifetimeCoins: 0, level: 1, boost: 0 }),
}))
