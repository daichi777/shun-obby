import { useGame } from '../../store'
import { useBuild } from './buildStore'
import { useQuests } from '../quests/questStore'
import { useCollection } from '../collection/collectionStore'
import { useProgress } from '../progress/progressStore'
import type { Cell } from './grid'

// 建築・おさいふ・もちもの・ずかん・バッジを localStorage に自動保存／復元する。
const KEY = 'kids-obby-save-v1'
const VERSION = 1

interface SaveData {
  version: number
  coins: number
  lifetimeCoins: number // 累計コイン（レベル復元用）
  inventory: Record<string, number>
  placed: { uid: string; itemId: string; anchor: Cell; rot: number }[]
  claimedQuests: string[] // 受け取り済みクエスト（再受け取り防止＝コイン無限取得バグの修正）
  discovered?: string[] // ずかんに登録ずみのアイテム（一度手に入れたら消えない）
  clearedAreas?: string[] // クリアしたエリア（ゴール旗のバッジ。リロードでボーナス再取得させない）
}

export function saveNow() {
  if (typeof localStorage === 'undefined') return
  try {
    const b = useBuild.getState()
    const data: SaveData = {
      version: VERSION,
      coins: useGame.getState().coins,
      lifetimeCoins: useGame.getState().lifetimeCoins,
      inventory: b.inventory,
      placed: b.placed.map((p) => ({ uid: p.uid, itemId: p.itemId, anchor: p.anchor, rot: p.rot })),
      claimedQuests: useQuests.getState().claimed,
      discovered: useCollection.getState().discovered,
      clearedAreas: useProgress.getState().cleared,
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
    if (typeof data.lifetimeCoins === 'number') useGame.getState().setLifetime(data.lifetimeCoins)
    if (Array.isArray(data.claimedQuests)) useQuests.setState({ claimed: data.claimedQuests })
    useBuild.getState().hydrate({ inventory: data.inventory, placed: data.placed })
    if (Array.isArray(data.clearedAreas)) useProgress.setState({ cleared: data.clearedAreas })
    if (Array.isArray(data.discovered)) {
      useCollection.getState().hydrate(data.discovered)
    } else {
      // 古いセーブ（discovered なし）だけ、在庫＋設置ずみから移行シード（演出なし）。
      // （新セーブでは常に discovered を保存するのでここは通らない。おてほんシードの
      //   見本アイテムを「じぶんで手に入れていないのに登録済み」にしないため。）
      const seed = new Set<string>()
      const b = useBuild.getState()
      for (const [id, n] of Object.entries(b.inventory)) if (n > 0) seed.add(id)
      for (const p of b.placed) seed.add(p.itemId)
      useCollection.getState().hydrate([...seed])
    }
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
  useQuests.subscribe(schedule) // クエスト受け取り済みの変化も保存（再受け取り防止を永続化）
  useCollection.subscribe(schedule) // ずかん登録も保存
  useProgress.subscribe(schedule) // エリアクリア（バッジ）も保存
  window.addEventListener('beforeunload', saveNow)
}
