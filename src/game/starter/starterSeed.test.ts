import { describe, it, expect, beforeEach } from 'vitest'
import { seedStarterWorld } from './starterSeed'
import { useBuild } from '../build/buildStore'
import { useCollection } from '../collection/collectionStore'

// おてほんシード（初回起動の見本ワールド）の挙動を固定する。

beforeEach(() => {
  useBuild.getState().reset()
  useCollection.getState().reset()
})

describe('おてほんシード', () => {
  it('からっぽの世界にだけ見本を置く', () => {
    seedStarterWorld()
    const placed = useBuild.getState().placed
    expect(placed.length).toBeGreaterThanOrEqual(5)
    expect(placed.some((p) => p.itemId === 'suberidai')).toBe(true)
    expect(placed.some((p) => p.itemId === 'ki')).toBe(true)
  })

  it('すでに何か置かれていたら何もしない（二重シード防止）', () => {
    useBuild.setState({ placed: [{ uid: 'p1', itemId: 'ki', anchor: [0, 0], rot: 0 }] })
    seedStarterWorld()
    expect(useBuild.getState().placed).toHaveLength(1)
  })

  it('見本はずかんに登録しない（じぶんで手に入れる喜びを残す）', () => {
    seedStarterWorld()
    expect(useCollection.getState().discovered).toHaveLength(0)
  })

  it('見本はクエストに数えない（すべりだい設置クエストが即達成にならない）', async () => {
    const { useQuests } = await import('../quests/questStore')
    useQuests.getState().reset()
    seedStarterWorld()
    // 見本に suberidai と ki×2 があるが、シードだけでは受け取れない
    expect(useQuests.getState().claim('slide1')).toBe(false)
    expect(useQuests.getState().claim('build5')).toBe(false)
    // じぶんで置いたら数える
    useBuild.setState({ inventory: { suberidai: 1 } })
    useBuild.getState().selectForPlace('suberidai')
    useBuild.getState().setHoverWorld(60, 60)
    expect(useBuild.getState().placeAtHover()).toBe(true)
    expect(useQuests.getState().claim('slide1')).toBe(true)
  })

  it('シード後に置いたアイテムの uid が見本とぶつからない', () => {
    seedStarterWorld()
    useBuild.setState({ inventory: { kinoko: 1 } })
    useBuild.getState().selectForPlace('kinoko')
    useBuild.getState().setHoverWorld(40, 40)
    expect(useBuild.getState().placeAtHover()).toBe(true)
    const uids = useBuild.getState().placed.map((p) => p.uid)
    expect(new Set(uids).size).toBe(uids.length) // 重複なし
  })
})
