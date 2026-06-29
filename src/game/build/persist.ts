import { useGame } from '../../store'
import { useBuild } from './buildStore'
import type { Cell } from './grid'

// 建築・おさいふ・もちものを localStorage に自動保存／復元する。
const KEY = 'kids-obby-save-v1'
const VERSION = 1

interface SaveData {
  version: number
  coins: number
  inventory: Record<string, number>
  placed: { uid: string; itemId: string; anchor: Cell; rot: number }[]
}

export function saveNow() {
  if (typeof localStorage === 'undefined') return
  try {
    const b = useBuild.getState()
    const data: SaveData = {
      version: VERSION,
      coins: useGame.getState().coins,
      inventory: b.inventory,
      placed: b.placed.map((p) => ({ uid: p.uid, itemId: p.itemId, anchor: p.anchor, rot: p.rot })),
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* 容量超過・直列化エラーは無視 */
  }
}

export function loadSave(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as Partial<SaveData>
    if (!data || data.version !== VERSION) return false
    if (typeof data.coins === 'number') useGame.setState({ coins: data.coins })
    useBuild.getState().hydrate({ inventory: data.inventory, placed: data.placed })
    return true
  } catch {
    return false
  }
}

// じぶんの せかいを ぜんぶ けす（おさいふ・もちものは のこす）
export function clearWorld() {
  useBuild.setState({ placed: [], history: [], mode: 'play', moveArmed: false, trashArmed: false })
  saveNow()
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let started = false

// 変更があるたびに（少し待ってまとめて）自動保存する
export function startAutosave() {
  if (started || typeof window === 'undefined') return
  started = true
  const schedule = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveNow, 600)
  }
  useBuild.subscribe(schedule)
  useGame.subscribe(schedule)
  window.addEventListener('beforeunload', saveNow)
}
