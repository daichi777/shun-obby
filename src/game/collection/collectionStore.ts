import { create } from 'zustand'
import { ITEM_BY_ID } from '../build/catalog'
import { showToast, burstConfetti } from '../fx/rewardStore'
import { playCheckpoint } from '../audio'

// ずかんコレクション。「一度でも手に入れたアイテム」を永続的に覚える。
// （在庫/設置からの導出だと clearWorld や消失で退行するため、専用ストアで持つ。
//   保存/復元は persist.ts が行う。）
interface CollectionState {
  discovered: string[]
  // はじめて手に入れたら true。silent でなければ「ずかんに とうろく！」のお祝いを出す。
  discover: (id: string, opts?: { silent?: boolean }) => boolean
  hydrate: (ids: string[]) => void // 保存データからの復元（演出なし）
  reset: () => void
}

export const useCollection = create<CollectionState>((set, get) => ({
  discovered: [],
  discover: (id, opts) => {
    const item = ITEM_BY_ID[id]
    if (!item) return false
    if (get().discovered.includes(id)) return false
    set((s) => ({ discovered: [...s.discovered, id] }))
    if (!opts?.silent) {
      showToast(`ずかんに「${item.name}」をとうろく！`, { emoji: '📖', kind: 'info' })
      burstConfetti(14)
      playCheckpoint()
    }
    return true
  },
  hydrate: (ids) => set({ discovered: ids.filter((id) => ITEM_BY_ID[id]) }),
  reset: () => set({ discovered: [] }),
}))
