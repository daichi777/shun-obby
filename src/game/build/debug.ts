import { useGame } from '../../store'
import { useBuild } from './buildStore'
import { CATALOG } from './catalog'
import { saveNow, loadSave, clearWorld } from './persist'

// Playwright 自律E2E用のビルド系デバッグAPI（window.__game.build）。
// 既存の window.__game（移動など）を壊さないようマージする。
export function setupBuildDebug() {
  const w = window as unknown as { __game?: Record<string, unknown> }
  w.__game = w.__game ?? {}
  w.__game.build = {
    getState: () => {
      const s = useBuild.getState()
      return {
        mode: s.mode,
        panel: s.panel,
        moveArmed: s.moveArmed,
        trashArmed: s.trashArmed,
        rotation: s.rotation,
        coins: useGame.getState().coins,
        inventory: s.inventory,
        placed: s.placed.map((p) => ({ uid: p.uid, itemId: p.itemId, anchor: p.anchor, rot: p.rot })),
        selectedItemId: s.selectedItemId,
        hover: s.hover,
        canPlace: s.canPlaceHover(),
        historyLen: s.history.length,
      }
    },
    addCoins: (n: number) => useGame.getState().addCoins(n),
    openShop: () => useBuild.getState().openShop(),
    openInventory: () => useBuild.getState().openInventory(),
    closePanel: () => useBuild.getState().closePanel(),
    buy: (id: string) => useBuild.getState().buy(id),
    selectItem: (id: string) => useBuild.getState().selectForPlace(id),
    setHover: (x: number, z: number) => useBuild.getState().setHoverWorld(x, z),
    place: () => useBuild.getState().placeAtHover(),
    rotate: () => useBuild.getState().rotate(),
    armMove: () => useBuild.getState().startMoveMode(),
    armTrash: () => useBuild.getState().startTrashMode(),
    pickUp: (uid: string) => useBuild.getState().pickUp(uid),
    deleteItem: (uid: string) => useBuild.getState().deleteItem(uid),
    cancel: () => useBuild.getState().cancel(),
    undo: () => useBuild.getState().undo(),
    save: () => saveNow(),
    load: () => loadSave(),
    clearWorld: () => clearWorld(),
    catalog: CATALOG.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      category: i.category,
      footprint: i.footprint,
    })),
  }
}
