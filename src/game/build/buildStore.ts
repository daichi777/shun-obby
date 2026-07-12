import { create } from 'zustand'
import { ITEM_BY_ID } from './catalog'
import { useGame } from '../../store'
import {
  snapToAnchor,
  cellsFor,
  inBounds,
  cellKey,
  effFootprint,
  groupCenter,
  type Cell,
} from './grid'
import {
  playBuy,
  playPlace,
  playPickup,
  playUndo,
  playDelete,
  playRotate,
  playNope,
} from '../audio'
import { sparkleAt } from '../fx/fxStore'
import { useCollection } from '../collection/collectionStore'

export type Mode = 'play' | 'placing' | 'moving'
export type Panel = 'none' | 'shop' | 'inventory'

export interface PlacedItem {
  uid: string
  itemId: string
  anchor: Cell
  rot: number // 0..3（90度きざみ）
}

type Action =
  | { type: 'place'; uid: string }
  | { type: 'move'; uid: string; from: Cell; fromRot: number }
  | { type: 'delete'; item: PlacedItem }

let uidCounter = 0
const nextUid = () => `p${++uidCounter}`

// スナップの手応え（対応端末のみ短くブルッ。タブレット向け）
const buzz = (ms = 15) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms)
  }
}

// 設置済みの中心ワールド座標（キラキラ用）
function placedCenter(p: PlacedItem): [number, number, number] {
  const item = ITEM_BY_ID[p.itemId]
  const fp = item ? effFootprint(item.footprint, p.rot) : [1, 1] as [number, number]
  return groupCenter(p.anchor, fp)
}

interface BuildState {
  mode: Mode
  panel: Panel
  moveArmed: boolean // 「うごかす」: 設置済みをクリックで持ち上げ
  trashArmed: boolean // 「けす」: 設置済みをクリックで削除
  inventory: Record<string, number>
  placed: PlacedItem[]
  history: Action[]
  selectedItemId: string | null
  rotation: number // 設置中アイテムの回転(0..3)
  movingUid: string | null
  movingFrom: Cell | null
  movingFromRot: number
  hover: Cell | null
  hoverWorld: [number, number] | null
  failFlashAt: number // 置けない場所をタップした時刻（赤タイルのパルス演出用）

  // パネル
  openShop: () => void
  openInventory: () => void
  closePanel: () => void

  // 購入
  buy: (id: string) => boolean

  // 設置フロー
  selectForPlace: (id: string) => void
  setHoverWorld: (px: number, pz: number) => void
  clearHover: () => void
  canPlaceHover: () => boolean
  placeAtHover: () => boolean
  rotate: () => void

  // 移動・削除
  startMoveMode: () => void
  startTrashMode: () => void
  pickUp: (uid: string) => void
  deleteItem: (uid: string) => void

  // 取り消し・キャンセル・保存復元
  cancel: () => void
  undo: () => boolean
  reset: () => void
  hydrate: (data: { inventory?: Record<string, number>; placed?: PlacedItem[] }) => void
}

// 指定uidを除いた占有セル集合（各アイテムの回転を反映）
function occupied(placed: PlacedItem[], ignoreUid?: string | null): Set<string> {
  const s = new Set<string>()
  for (const p of placed) {
    if (p.uid === ignoreUid) continue
    const item = ITEM_BY_ID[p.itemId]
    if (!item) continue
    for (const c of cellsFor(p.anchor, effFootprint(item.footprint, p.rot))) s.add(cellKey(c))
  }
  return s
}

export const useBuild = create<BuildState>((set, get) => {
  // 持ち上げ中(mode==='moving')のアイテムを元の位置へ戻す。
  // うごかす途中にホットバー選択・うごかす/けすトグル・もどす(undo)が割り込むと、
  // 持ち上げ中のアイテムが世界からも持ち物からも消えてしまうため、
  // moving から抜ける状態遷移の前に必ずここで足場へ返す。
  const restoreHeld = () => {
    const { mode, movingUid, movingFrom, movingFromRot, selectedItemId } = get()
    if (mode !== 'moving' || !movingUid || !movingFrom || !selectedItemId) return
    const restore: PlacedItem = {
      uid: movingUid,
      itemId: selectedItemId,
      anchor: movingFrom,
      rot: movingFromRot,
    }
    set((s) => ({ placed: [...s.placed, restore], movingUid: null, movingFrom: null }))
  }

  return {
  mode: 'play',
  panel: 'none',
  moveArmed: false,
  trashArmed: false,
  inventory: {},
  placed: [],
  history: [],
  selectedItemId: null,
  rotation: 0,
  movingUid: null,
  movingFrom: null,
  movingFromRot: 0,
  hover: null,
  hoverWorld: null,
  failFlashAt: 0,

  openShop: () => set({ panel: 'shop' }),
  openInventory: () => set({ panel: 'inventory' }),
  closePanel: () => set({ panel: 'none' }),

  buy: (id) => {
    const item = ITEM_BY_ID[id]
    if (!item) return false
    if (!useGame.getState().spend(item.price)) {
      playNope()
      return false
    }
    set((s) => ({ inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + 1 } }))
    playBuy()
    useCollection.getState().discover(id) // はじめての購入なら「ずかんに とうろく！」
    return true
  },

  selectForPlace: (id) => {
    if ((get().inventory[id] ?? 0) <= 0) return
    restoreHeld()
    set({
      mode: 'placing',
      panel: 'none',
      moveArmed: false,
      trashArmed: false,
      selectedItemId: id,
      rotation: 0,
      movingUid: null,
      movingFrom: null,
      hover: null,
      hoverWorld: null,
    })
  },

  setHoverWorld: (px, pz) => {
    const { mode, selectedItemId, rotation } = get()
    if (mode !== 'placing' && mode !== 'moving') return
    if (!selectedItemId) return
    const item = ITEM_BY_ID[selectedItemId]
    if (!item) return
    set({
      hover: snapToAnchor(px, pz, effFootprint(item.footprint, rotation)),
      hoverWorld: [px, pz],
    })
  },

  clearHover: () => set({ hover: null }),

  canPlaceHover: () => {
    const { hover, selectedItemId, placed, movingUid, rotation } = get()
    if (!hover || !selectedItemId) return false
    const item = ITEM_BY_ID[selectedItemId]
    if (!item) return false
    const cells = cellsFor(hover, effFootprint(item.footprint, rotation))
    if (!inBounds(cells)) return false
    const occ = occupied(placed, movingUid)
    return cells.every((c) => !occ.has(cellKey(c)))
  },

  rotate: () => {
    const { mode, selectedItemId, rotation, hoverWorld } = get()
    if ((mode !== 'placing' && mode !== 'moving') || !selectedItemId) return
    const item = ITEM_BY_ID[selectedItemId]
    if (!item) return
    const nextRot = (rotation + 1) % 4
    // ポインター位置を保ったまま回す（非正方形でもズレないよう再スナップ）
    const nextHover = hoverWorld
      ? snapToAnchor(hoverWorld[0], hoverWorld[1], effFootprint(item.footprint, nextRot))
      : get().hover
    set({ rotation: nextRot, hover: nextHover })
    playRotate()
  },

  placeAtHover: () => {
    const state = get()
    if (!state.canPlaceHover()) {
      // おっとソフトフェイル：無効な場所へのタップに音＋赤タイルのパルスで応える。
      // （無反応だと「壊れた？」と連打（rage tap）になるため）
      if (state.hover && state.selectedItemId) {
        playNope()
        set({ failFlashAt: typeof performance !== 'undefined' ? performance.now() : 1 })
      }
      return false
    }
    const { mode, selectedItemId, hover, movingUid, movingFrom, movingFromRot, rotation } = state
    if (!selectedItemId || !hover) return false

    if (mode === 'moving' && movingUid && movingFrom) {
      const placedItem: PlacedItem = { uid: movingUid, itemId: selectedItemId, anchor: hover, rot: rotation }
      set((s) => ({
        placed: [...s.placed, placedItem],
        history: [...s.history, { type: 'move', uid: movingUid, from: movingFrom, fromRot: movingFromRot }],
        mode: 'play',
        selectedItemId: null,
        movingUid: null,
        movingFrom: null,
        hover: null,
        hoverWorld: null,
      }))
      playPlace()
      buzz()
      sparkleAt(placedCenter(placedItem))
      return true
    }

    if ((state.inventory[selectedItemId] ?? 0) <= 0) return false
    const uid = nextUid()
    const placedItem: PlacedItem = { uid, itemId: selectedItemId, anchor: hover, rot: rotation }
    set((s) => {
      const remaining = (s.inventory[selectedItemId] ?? 0) - 1
      const keepPlacing = remaining > 0
      return {
        placed: [...s.placed, placedItem],
        inventory: { ...s.inventory, [selectedItemId]: remaining },
        history: [...s.history, { type: 'place', uid }],
        mode: keepPlacing ? 'placing' : 'play',
        selectedItemId: keepPlacing ? selectedItemId : null,
        hover: keepPlacing ? s.hover : null,
      }
    })
    playPlace()
    buzz()
    sparkleAt(placedCenter(placedItem))
    // 置いたアイテムも「手に入れた」扱いで図鑑登録
    // （おてほんシード等、購入以外で持ち物に入ったものを置き直したとき用）
    useCollection.getState().discover(selectedItemId)
    return true
  },

  startMoveMode: () => {
    restoreHeld()
    set((s) => ({
      moveArmed: !s.moveArmed,
      trashArmed: false,
      mode: 'play',
      panel: 'none',
      selectedItemId: null,
      hover: null,
    }))
  },

  startTrashMode: () => {
    restoreHeld()
    set((s) => ({
      trashArmed: !s.trashArmed,
      moveArmed: false,
      mode: 'play',
      panel: 'none',
      selectedItemId: null,
      hover: null,
    }))
  },

  pickUp: (uid) => {
    const { placed, moveArmed, mode } = get()
    if (!(moveArmed || mode === 'play')) return
    const target = placed.find((p) => p.uid === uid)
    if (!target) return
    set((s) => ({
      placed: s.placed.filter((p) => p.uid !== uid),
      mode: 'moving',
      moveArmed: false,
      selectedItemId: target.itemId,
      rotation: target.rot,
      movingUid: uid,
      movingFrom: target.anchor,
      movingFromRot: target.rot,
      hover: target.anchor,
      hoverWorld: null,
    }))
    playPickup()
  },

  deleteItem: (uid) => {
    const target = get().placed.find((p) => p.uid === uid)
    if (!target) return
    sparkleAt(placedCenter(target), '#ff7a7a')
    set((s) => ({
      placed: s.placed.filter((p) => p.uid !== uid),
      inventory: { ...s.inventory, [target.itemId]: (s.inventory[target.itemId] ?? 0) + 1 },
      history: [...s.history, { type: 'delete', item: target }],
    }))
    playDelete()
  },

  cancel: () => {
    restoreHeld()
    set({
      mode: 'play',
      moveArmed: false,
      trashArmed: false,
      selectedItemId: null,
      movingUid: null,
      movingFrom: null,
      hover: null,
      hoverWorld: null,
    })
  },

  undo: () => {
    restoreHeld()
    const { history } = get()
    if (history.length === 0) return false
    const last = history[history.length - 1]
    if (last.type === 'place') {
      const target = get().placed.find((p) => p.uid === last.uid)
      set((s) => ({
        placed: s.placed.filter((p) => p.uid !== last.uid),
        inventory: target
          ? { ...s.inventory, [target.itemId]: (s.inventory[target.itemId] ?? 0) + 1 }
          : s.inventory,
        history: s.history.slice(0, -1),
        mode: 'play',
        selectedItemId: null,
        hover: null,
      }))
    } else if (last.type === 'move') {
      set((s) => ({
        placed: s.placed.map((p) =>
          p.uid === last.uid ? { ...p, anchor: last.from, rot: last.fromRot } : p,
        ),
        history: s.history.slice(0, -1),
        mode: 'play',
        selectedItemId: null,
        hover: null,
      }))
    } else {
      // delete を取り消し: 設置済みに戻し、返却したインベントリを1つ戻す
      const it = last.item
      set((s) => ({
        placed: [...s.placed, it],
        inventory: { ...s.inventory, [it.itemId]: Math.max(0, (s.inventory[it.itemId] ?? 0) - 1) },
        history: s.history.slice(0, -1),
        mode: 'play',
        selectedItemId: null,
        hover: null,
      }))
    }
    playUndo()
    return true
  },

  reset: () =>
    set({
      mode: 'play',
      panel: 'none',
      moveArmed: false,
      trashArmed: false,
      inventory: {},
      placed: [],
      history: [],
      selectedItemId: null,
      rotation: 0,
      movingUid: null,
      movingFrom: null,
      hover: null,
      hoverWorld: null,
    }),

  hydrate: (data) => {
    const placed = (data.placed ?? []).filter((p) => ITEM_BY_ID[p.itemId])
    // uidカウンタを復元データの最大値より先へ進め、衝突を防ぐ
    let maxN = 0
    for (const p of placed) {
      const n = parseInt(String(p.uid).replace(/^p/, ''), 10)
      if (Number.isFinite(n) && n > maxN) maxN = n
    }
    uidCounter = Math.max(uidCounter, maxN)
    set({
      inventory: data.inventory ?? {},
      placed: placed.map((p) => ({ ...p, rot: p.rot ?? 0 })),
      history: [],
      mode: 'play',
      panel: 'none',
      moveArmed: false,
      trashArmed: false,
      selectedItemId: null,
      hover: null,
    })
  },
  }
})
