import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { triggerEmote, currentEmote, clearEmote, EMOTE_DURATION_MS } from './emoteSignal'

// エモート合図の時限動作を固定する（performance.now をモックして時間を進める）。

let t = 1000
beforeEach(() => {
  t = 1000
  vi.spyOn(performance, 'now').mockImplementation(() => t)
  clearEmote()
})
afterEach(() => vi.restoreAllMocks())

describe('エモート合図', () => {
  it('trigger すると期間中は current がその種類を返す', () => {
    triggerEmote('dance')
    expect(currentEmote()).toBe('dance')
    t += EMOTE_DURATION_MS - 100
    expect(currentEmote()).toBe('dance')
  })

  it('期間が過ぎたら null に戻る', () => {
    triggerEmote('wave')
    t += EMOTE_DURATION_MS + 1
    expect(currentEmote()).toBeNull()
  })

  it('連続 trigger は上書き（最後のエモートが勝つ）', () => {
    triggerEmote('wave')
    t += 500
    triggerEmote('heart')
    expect(currentEmote()).toBe('heart')
    t += EMOTE_DURATION_MS - 100
    expect(currentEmote()).toBe('heart') // 時間も延長されている
  })

  it('clear で即座に止まる', () => {
    triggerEmote('banzai')
    clearEmote()
    expect(currentEmote()).toBeNull()
  })
})
