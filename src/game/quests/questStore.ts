import { create } from 'zustand'
import { useGame } from '../../store'
import { useBuild } from '../build/buildStore'

// ごほうびクエスト（右パネル）。進捗は「累計コイン」と「設置したアイテム」から
// その場で計算するので、イベントの配線は不要（状態を見るだけ）。
export type QuestKind = 'coins' | 'placeAny' | 'placeId'

export interface QuestDef {
  id: string
  icon: string
  label: string // ひらがな中心の説明
  goal: number
  reward: number // 達成でもらえるコイン
  kind: QuestKind
  matchId?: string // kind==='placeId' のとき対象アイテムID
}

export const QUESTS: QuestDef[] = [
  { id: 'coins15', icon: '🪙', label: 'コインを 15こ あつめる', goal: 15, reward: 10, kind: 'coins' },
  { id: 'slide1', icon: '🛝', label: 'すべりだいを 1こ おく', goal: 1, reward: 15, kind: 'placeId', matchId: 'suberidai' },
  { id: 'trees3', icon: '🌳', label: 'きを 3ぼん うえる', goal: 3, reward: 12, kind: 'placeId', matchId: 'ki' },
  { id: 'build5', icon: '🏗️', label: 'アイテムを 5こ おく', goal: 5, reward: 10, kind: 'placeAny' },
]

// クエスト1つの現在の進捗値（ストアを直接読む。フック外でも使える）
function progressOf(q: QuestDef): number {
  if (q.kind === 'coins') return useGame.getState().lifetimeCoins
  const placed = useBuild.getState().placed
  if (q.kind === 'placeAny') return placed.length
  return placed.filter((p) => p.itemId === q.matchId).length
}

interface QuestState {
  claimed: string[]
  // 達成済み & 未受取 のときだけ、ごほうびコインを付与して受け取り済みにする
  claim: (id: string) => boolean
  reset: () => void
}

export const useQuests = create<QuestState>((set, get) => ({
  claimed: [],
  claim: (id) => {
    const q = QUESTS.find((x) => x.id === id)
    if (!q) return false
    if (get().claimed.includes(id)) return false
    if (progressOf(q) < q.goal) return false
    useGame.getState().addCoins(q.reward)
    set((s) => ({ claimed: [...s.claimed, id] }))
    return true
  },
  reset: () => set({ claimed: [] }),
}))

export interface QuestView extends QuestDef {
  progress: number // 0..goal にクランプ
  done: boolean
  claimed: boolean
}

// パネル用：進捗つきクエスト一覧（lifetimeCoins / placed / claimed に反応して再計算）
export function useQuestProgress(): QuestView[] {
  const lifetime = useGame((s) => s.lifetimeCoins)
  const placed = useBuild((s) => s.placed)
  const claimed = useQuests((s) => s.claimed)
  return QUESTS.map((q) => {
    let p = 0
    if (q.kind === 'coins') p = lifetime
    else if (q.kind === 'placeAny') p = placed.length
    else p = placed.filter((x) => x.itemId === q.matchId).length
    return {
      ...q,
      progress: Math.min(p, q.goal),
      done: p >= q.goal,
      claimed: claimed.includes(q.id),
    }
  })
}
