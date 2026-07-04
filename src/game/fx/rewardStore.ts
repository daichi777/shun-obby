import { create } from 'zustand'
import { playCoin } from '../audio'

// ごほうび演出の共通土台。以降のレベルアップ[5]・図鑑初取得[E]・ゴール到達[B] も
// ここに乗せて再利用する。3種類を扱う:
//   1) floats  … ワールドに浮く「+1」テキスト（Canvas内の FloatingRewards が描画）
//   2) toasts  … 画面中央のトースト（DOMの RewardToasts が描画）
//   3) confetti… 紙吹雪バースト（同上）
// 発火は下のヘルパー（flyReward / showToast / burstConfetti / onCoinCollected）で行う。

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0)

export interface FloatText {
  id: number
  pos: [number, number, number]
  text: string
  color: string
  born: number
}

export type ToastKind = 'combo' | 'levelup' | 'goal' | 'info'
export interface Toast {
  id: number
  text: string
  emoji?: string
  kind: ToastKind
  born: number
}

export interface Confetti {
  id: number
  n: number
  born: number
}

// 画面中央にドンと出す大きなお祝いカード（レベルアップ／ゴール到達など）。1つだけ表示。
export interface Celebration {
  id: number
  title: string
  sub?: string
  emoji?: string
}

interface RewardState {
  floats: FloatText[]
  toasts: Toast[]
  confetti: Confetti[]
  celebration: Celebration | null
  addFloat: (pos: [number, number, number], text: string, color: string) => void
  removeFloat: (id: number) => void
  addToast: (t: Omit<Toast, 'id' | 'born'>) => void
  removeToast: (id: number) => void
  addConfetti: (n: number) => void
  removeConfetti: (id: number) => void
  setCelebration: (c: Omit<Celebration, 'id'>) => void
  clearCelebration: () => void
}

let rid = 0
export const useReward = create<RewardState>((set) => ({
  floats: [],
  toasts: [],
  confetti: [],
  celebration: null,
  addFloat: (pos, text, color) =>
    set((s) => ({ floats: [...s.floats, { id: ++rid, pos, text, color, born: now() }] })),
  removeFloat: (id) => set((s) => ({ floats: s.floats.filter((f) => f.id !== id) })),
  addToast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: ++rid, born: now() }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  addConfetti: (n) => set((s) => ({ confetti: [...s.confetti, { id: ++rid, n, born: now() }] })),
  removeConfetti: (id) => set((s) => ({ confetti: s.confetti.filter((c) => c.id !== id) })),
  setCelebration: (c) => set({ celebration: { ...c, id: ++rid } }),
  clearCelebration: () => set({ celebration: null }),
}))

// ---- 外部ヘルパー（Canvasの内外どこからでも呼べる）----
export const flyReward = (pos: [number, number, number], text: string, color = '#fff2a8') =>
  useReward.getState().addFloat(pos, text, color)
export const showToast = (text: string, opts?: { emoji?: string; kind?: ToastKind }) =>
  useReward.getState().addToast({ text, emoji: opts?.emoji, kind: opts?.kind ?? 'info' })
export const burstConfetti = (n = 24) => useReward.getState().addConfetti(n)
export const celebrate = (c: Omit<Celebration, 'id'>) => useReward.getState().setCelebration(c)

// ---- コイン取得のジュースをまとめて発火 ----
// 連続取得で: 音のピッチを半音ずつ上げ、「+N」を飛ばし、5連ごとに紙吹雪＋トースト。
const COMBO_RESET_MS = 1200 // これ以上あくとコンボ切れ
const MAX_SEMITONES = 12 // 上げすぎ防止（1オクターブまで）
let streak = 0
let lastPickupAt = -Infinity

export function onCoinCollected(pos: [number, number, number], amount: number) {
  const t = now()
  streak = t - lastPickupAt <= COMBO_RESET_MS ? streak + 1 : 1
  lastPickupAt = t

  playCoin(Math.min(streak - 1, MAX_SEMITONES))
  flyReward(pos, `+${amount}`, amount > 1 ? '#ffd54a' : '#fff2a8')

  // れんぞくボーナス（5,10,15…）でお祝い
  if (streak % 5 === 0) {
    burstConfetti(18)
    showToast(`${streak}れんぞく！`, { emoji: '🔥', kind: 'combo' })
  }
}

// 場面切替などでコンボをリセットしたいとき用（今は未使用だが土台として公開）。
export const resetCombo = () => {
  streak = 0
  lastPickupAt = -Infinity
}
