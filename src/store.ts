import { create } from 'zustand'

// ゲーム全体のじょうたい（コインのかず・レベル など）。
// Canvas の中（コイン）からも外（HUD）からも参照するため zustand で共有する。
interface GameState {
  coins: number // いま持っているコイン（つかうと減る）
  totalCoins: number // ステージ上のコイン総数（進捗表示用）
  lifetimeCoins: number // これまで集めた累計（レベル・クエスト用。減らない）
  level: number // 累計コインから決まるレベル
  boost: number // レベルに応じたブースト（%表示・演出用）
  pendingLevelUp: number // 0=なし / それ以外=上がった先のレベル（お祝い演出のトリガー）
  collect: () => number // 拾った枚数（ブーストぶん増える）を返す
  addCoins: (n: number) => void
  spend: (n: number) => boolean
  setTotal: (n: number) => void
  setLifetime: (n: number) => void // 保存データからの復元用
  clearLevelUp: () => void // お祝い演出を出したら消費する
  reset: () => void
}

// 累計コイン → レベル / ブースト
const levelFor = (lifetime: number): number => 1 + Math.floor(lifetime / 12)
const boostFor = (level: number): number => (level - 1) * 5
// ブーストぶん、拾うコインの価値が上がる（20%ごとに +1 枚。最低 +1 は必ず入る）。
// 例) Lv1=+1 / Lv5(+20%)=+2 / Lv9(+40%)=+3 …
// ※ 累計(lifetimeCoins)はレベル進行用なので +1 のまま（ブーストで加速させない）。
const coinGainFor = (boost: number): number => 1 + Math.floor(boost / 20)

export const useGame = create<GameState>((set, get) => ({
  coins: 0,
  totalCoins: 0,
  lifetimeCoins: 0,
  level: 1,
  boost: 0,
  pendingLevelUp: 0,
  collect: () => {
    const s = get()
    const lifetimeCoins = s.lifetimeCoins + 1 // 累計＝拾った回数（レベル進行用・ブースト非依存）
    const level = levelFor(lifetimeCoins)
    const boost = boostFor(level)
    const gain = coinGainFor(boost) // おさいふはブーストぶん多く増える
    set({
      coins: s.coins + gain,
      lifetimeCoins,
      level,
      boost,
      // レベルが上がった瞬間だけお祝いをトリガー（復元 setLifetime では立てない）
      ...(level > s.level ? { pendingLevelUp: level } : {}),
    })
    return gain
  },
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
  clearLevelUp: () => set({ pendingLevelUp: 0 }),
  reset: () => set({ coins: 0, lifetimeCoins: 0, level: 1, boost: 0, pendingLevelUp: 0 }),
}))
