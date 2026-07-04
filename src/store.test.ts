import { describe, it, expect, beforeEach } from 'vitest'
import { useGame } from './store'

// コインのけいざい（レベル→ブースト→拾うコインの価値）を固定するテスト。
// レベルは lifetimeCoins/12、ブーストは (level-1)*5%、拾う枚数は 1 + floor(boost/20)。
const g = () => useGame.getState()
const collectN = (n: number) => {
  for (let i = 0; i < n; i++) g().collect()
}

describe('コインのけいざい', () => {
  beforeEach(() => g().reset())

  it('はじめは 1 枚ずつ増える（ブースト0）', () => {
    collectN(1)
    expect(g().coins).toBe(1)
    expect(g().lifetimeCoins).toBe(1)
    expect(g().level).toBe(1)
    expect(g().boost).toBe(0)
  })

  it('レベル4（ブースト15%）まではまだ +1 のまま', () => {
    collectN(47) // lifetime47 → level4 → boost15% → floor(15/20)=0
    expect(g().lifetimeCoins).toBe(47)
    expect(g().level).toBe(4)
    expect(g().boost).toBe(15)
    expect(g().coins).toBe(47)
  })

  it('レベル5（ブースト20%）で 1 枚が +2 になる', () => {
    collectN(48) // 48枚目でlevel5・boost20% → その1枚は+2
    expect(g().lifetimeCoins).toBe(48)
    expect(g().level).toBe(5)
    expect(g().boost).toBe(20)
    expect(g().coins).toBe(49) // 47*1 + 1*2
    g().collect() // 以降のlevel5の1枚も+2
    expect(g().coins).toBe(51)
    expect(g().lifetimeCoins).toBe(49) // 累計はブースト非依存（+1のまま）
  })

  it('レベルが上がった瞬間だけ pendingLevelUp が立ち、消費できる', () => {
    collectN(11) // lifetime11 → まだ Lv1
    expect(g().level).toBe(1)
    expect(g().pendingLevelUp).toBe(0)
    g().collect() // 12枚目で Lv2 へ
    expect(g().level).toBe(2)
    expect(g().pendingLevelUp).toBe(2) // 上がった先のレベルが入る
    g().clearLevelUp()
    expect(g().pendingLevelUp).toBe(0)
  })

  it('つかっても累計・レベルは減らない', () => {
    collectN(48)
    const okSpend = g().spend(10)
    expect(okSpend).toBe(true)
    expect(g().coins).toBe(39) // 49 - 10
    expect(g().lifetimeCoins).toBe(48)
    expect(g().level).toBe(5)
  })
})
