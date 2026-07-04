import { create } from 'zustand'

// どのアスレチックエリアを「クリア（ゴール到達）」したかを覚える。
// いまはセッション内のみ（将来 図鑑/バッジ や persist に載せる想定）。
interface ProgressState {
  cleared: string[]
  markCleared: (areaId: string) => boolean // 初クリアなら true（お祝いを1回だけ出すため）
  reset: () => void
}

export const useProgress = create<ProgressState>((set, get) => ({
  cleared: [],
  markCleared: (id) => {
    if (get().cleared.includes(id)) return false
    set((s) => ({ cleared: [...s.cleared, id] }))
    return true
  },
  reset: () => set({ cleared: [] }),
}))
