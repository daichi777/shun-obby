import { create } from 'zustand'

// バーチャルスティック＆ジャンプボタンの状態。
// x,y は -1..1（y は上が +＝まえ）。active=スティックを触っている。
interface TouchState {
  x: number
  y: number
  active: boolean
  jump: boolean
  setStick: (x: number, y: number) => void
  release: () => void
  setJump: (b: boolean) => void
}

export const useTouch = create<TouchState>((set) => ({
  x: 0,
  y: 0,
  active: false,
  jump: false,
  setStick: (x, y) => set({ x, y, active: true }),
  release: () => set({ x: 0, y: 0, active: false }),
  setJump: (b) => set({ jump: b }),
}))

// タッチ端末か（スティックの表示判定に使用）
export const isCoarsePointer = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches

// Playwright 用デバッグ（実機タッチがなくても入力を注入できる）
export function setupTouchDebug() {
  const w = window as unknown as { __game?: Record<string, unknown> }
  w.__game = w.__game ?? {}
  w.__game.touch = {
    setStick: (x: number, y: number) => useTouch.getState().setStick(x, y),
    release: () => useTouch.getState().release(),
    setJump: (b: boolean) => useTouch.getState().setJump(b),
    getState: () => {
      const s = useTouch.getState()
      return { x: s.x, y: s.y, active: s.active, jump: s.jump }
    },
  }
}
