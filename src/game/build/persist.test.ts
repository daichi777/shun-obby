import { describe, it, expect, beforeEach } from 'vitest'
import { saveNow, loadSave } from './persist'
import { useBuild } from './buildStore'
import { useGame } from '../../store'
import { useQuests } from '../quests/questStore'
import { useCollection } from '../collection/collectionStore'
import { useProgress } from '../progress/progressStore'

// セーブ/ロードの往復と、旧セーブ（ずかん情報なし）からの移行を固定する。
// vitest は node 環境なので localStorage をスタブする。

const KEY = 'kids-obby-save-v1'
const mem = new Map<string, string>()

beforeEach(() => {
  mem.clear()
  ;(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  }
  useGame.getState().reset()
  useQuests.getState().reset()
  useCollection.getState().reset()
  useProgress.getState().reset()
  useBuild.getState().reset()
})

describe('セーブ/ロードの往復', () => {
  it('おさいふ・ずかん・バッジ・クエスト受取が復元される', () => {
    useGame.getState().addCoins(42)
    useGame.getState().setLifetime(30)
    useBuild.setState({ inventory: { ki: 2 }, placed: [{ uid: 'p1', itemId: 'ohana', anchor: [2, 3], rot: 1 }] })
    useQuests.setState({ claimed: ['coins15'] })
    useCollection.getState().hydrate(['ki', 'ohana', 'niji'])
    useProgress.getState().markCleared('sky')
    saveNow()

    // ぜんぶリセットしてから復元
    useGame.getState().reset()
    useQuests.getState().reset()
    useCollection.getState().reset()
    useProgress.getState().reset()
    useBuild.getState().reset()
    expect(loadSave()).toBe(true)

    expect(useGame.getState().coins).toBe(42)
    expect(useGame.getState().lifetimeCoins).toBe(30)
    expect(useBuild.getState().inventory['ki']).toBe(2)
    expect(useBuild.getState().placed[0]).toMatchObject({ itemId: 'ohana', anchor: [2, 3], rot: 1 })
    expect(useQuests.getState().claimed).toEqual(['coins15'])
    expect(useCollection.getState().discovered).toEqual(expect.arrayContaining(['ki', 'ohana', 'niji']))
    expect(useProgress.getState().cleared).toEqual(['sky'])
  })

  it('新セーブでは設置ずみでも discovered に自動登録しない（おてほんシード対策）', () => {
    mem.set(
      KEY,
      JSON.stringify({
        version: 1,
        coins: 0,
        lifetimeCoins: 0,
        inventory: {},
        placed: [{ uid: 'p1', itemId: 'suberidai', anchor: [-5, 0], rot: 0 }],
        claimedQuests: [],
        discovered: [], // 新セーブは常に discovered を持つ
        clearedAreas: [],
      }),
    )
    expect(loadSave()).toBe(true)
    expect(useCollection.getState().discovered).toHaveLength(0)
  })

  it('旧セーブ（discovered なし）は在庫＋設置ずみからずかんへ移行する', () => {
    mem.set(
      KEY,
      JSON.stringify({
        version: 1,
        coins: 5,
        lifetimeCoins: 5,
        inventory: { ki: 1, kinoko: 0 },
        placed: [{ uid: 'p9', itemId: 'ohana', anchor: [0, 0], rot: 0 }],
        claimedQuests: [],
      }),
    )
    expect(loadSave()).toBe(true)
    const d = useCollection.getState().discovered
    expect(d).toContain('ki') // 在庫から
    expect(d).toContain('ohana') // 設置ずみから
    expect(d).not.toContain('kinoko') // 0個は未取得
    expect(useProgress.getState().cleared).toEqual([])
  })
})
