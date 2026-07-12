import { describe, it, expect, beforeEach } from 'vitest'
import { useBuild, type PlacedItem } from './buildStore'
import { useGame } from '../../store'

// 「うごかす」で持ち上げ中(mode==='moving')に別の操作が割り込んでも、
// 持ち上げたアイテムが消えない（元の位置へ戻る）ことを固定するテスト。
// 消失バグ: selectForPlace / startMoveMode / startTrashMode / undo が
// moving 状態を復元せずに握りつぶすと、世界からも持ち物からも永久に消えていた。

const b = () => useBuild.getState()

const placedKi: PlacedItem = { uid: 'p100', itemId: 'ki', anchor: [3, 3], rot: 0 }

// アイテムを1つ設置済み＋別アイテムを1つ所持している状態を作る
const setup = () => {
  b().reset()
  useGame.getState().reset()
  useBuild.setState({
    placed: [placedKi],
    inventory: { ohana: 1 },
  })
}

// 設置済みの ki を「うごかす」で持ち上げた状態にする
const pickUpKi = () => {
  useBuild.setState({ moveArmed: true })
  b().pickUp('p100')
  expect(b().mode).toBe('moving')
  expect(b().placed.find((p) => p.uid === 'p100')).toBeUndefined() // 世界からは一時的に消えている
}

const expectKiRestored = () => {
  const ki = b().placed.find((p) => p.uid === 'p100')
  expect(ki).toBeDefined()
  expect(ki?.anchor).toEqual([3, 3])
  expect(ki?.rot).toBe(0)
}

describe('うごかす中の割り込みでアイテムが消えない', () => {
  beforeEach(setup)

  it('ホットバー選択(selectForPlace)が割り込んでも元の位置へ戻る', () => {
    pickUpKi()
    b().selectForPlace('ohana')
    expect(b().mode).toBe('placing')
    expect(b().selectedItemId).toBe('ohana')
    expectKiRestored()
  })

  it('「うごかす」トグル(startMoveMode)が割り込んでも元の位置へ戻る', () => {
    pickUpKi()
    b().startMoveMode()
    expect(b().mode).toBe('play')
    expectKiRestored()
  })

  it('「けす」トグル(startTrashMode)が割り込んでも元の位置へ戻る', () => {
    pickUpKi()
    b().startTrashMode()
    expect(b().mode).toBe('play')
    expectKiRestored()
  })

  it('「もどす」(undo)が割り込んでも元の位置へ戻る', () => {
    // 履歴を作る: ohana を1つ設置してから ki を持ち上げ、undo する
    useBuild.setState({ mode: 'placing', selectedItemId: 'ohana', hover: [5, 5] })
    expect(b().placeAtHover()).toBe(true)
    pickUpKi()
    b().undo() // 直前の「ohana 設置」が取り消される
    expect(b().mode).toBe('play')
    expectKiRestored()
    expect(b().inventory['ohana']).toBe(1) // 設置取り消しで手元に戻る
    expect(b().placed.find((p) => p.itemId === 'ohana')).toBeUndefined()
  })

  it('やめる(cancel)で元の位置へ戻る（従来動作の維持）', () => {
    pickUpKi()
    b().cancel()
    expect(b().mode).toBe('play')
    expectKiRestored()
  })

  it('もちものから置いたアイテムはずかんに登録される（買わずに手に入れた分も）', async () => {
    const { useCollection } = await import('../collection/collectionStore')
    useCollection.getState().reset()
    b().selectForPlace('ohana')
    b().setHoverWorld(12 * 4, 12 * 4)
    expect(b().placeAtHover()).toBe(true)
    expect(useCollection.getState().discovered).toContain('ohana')
  })

  it('置けない場所への設置は失敗し、おっとフラッシュが立つ', () => {
    // ki (p100) が占有しているセル(3,3)に ohana を重ねようとする
    expect(b().failFlashAt).toBe(0)
    b().selectForPlace('ohana')
    b().setHoverWorld(3 * 4, 3 * 4) // CELL=4 のセル(3,3)
    expect(b().placeAtHover()).toBe(false)
    expect(b().failFlashAt).toBeGreaterThan(0) // 赤タイルのパルスが発火
    expect(b().inventory['ohana']).toBe(1) // 消費されない
  })

  it('持ち上げ→別の場所へ置き直しは今までどおり動く', () => {
    pickUpKi()
    b().setHoverWorld(8 * 4, 8 * 4) // CELL=4 のセル(8,8)あたり
    expect(b().placeAtHover()).toBe(true)
    expect(b().mode).toBe('play')
    expect(b().placed).toHaveLength(1)
    expect(b().placed[0].uid).toBe('p100')
    expect(b().placed[0].anchor).not.toEqual([3, 3])
  })
})
