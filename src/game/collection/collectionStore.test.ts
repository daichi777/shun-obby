import { describe, it, expect, beforeEach } from 'vitest'
import { useCollection } from './collectionStore'
import { useReward } from '../fx/rewardStore'
import { useQuests } from '../quests/questStore'
import { useGame } from '../../store'

// ずかんコレクション（一度手に入れたら消えない）と図鑑クエストの連動を固定する。

const c = () => useCollection.getState()

beforeEach(() => {
  c().reset()
  useGame.getState().reset()
  useQuests.getState().reset()
  useReward.setState({ toasts: [], confetti: [], floats: [], celebration: null })
})

describe('ずかんコレクション', () => {
  it('はじめての登録は true を返し、お祝いトーストが出る', () => {
    expect(c().discover('ki')).toBe(true)
    expect(c().discovered).toContain('ki')
    expect(useReward.getState().toasts.length).toBe(1)
    expect(useReward.getState().toasts[0].text).toContain('き')
  })

  it('2回目の登録は false・トーストも増えない', () => {
    c().discover('ki')
    const toasts = useReward.getState().toasts.length
    expect(c().discover('ki')).toBe(false)
    expect(c().discovered.filter((d) => d === 'ki')).toHaveLength(1)
    expect(useReward.getState().toasts.length).toBe(toasts)
  })

  it('カタログにない id は登録されない', () => {
    expect(c().discover('nai-item')).toBe(false)
    expect(c().discovered).toHaveLength(0)
  })

  it('silent 指定は演出なしで登録する（復元・移行用）', () => {
    expect(c().discover('ohana', { silent: true })).toBe(true)
    expect(useReward.getState().toasts).toHaveLength(0)
  })

  it('hydrate はカタログにない id を除外して丸ごと置き換える', () => {
    c().hydrate(['ki', 'kieta-item', 'ohana'])
    expect(c().discovered).toEqual(['ki', 'ohana'])
  })
})

describe('図鑑クエスト（zukan6）', () => {
  it('6種類登録するまで受け取れず、達成したら +12 コイン', () => {
    const ids = ['ki', 'ohana', 'kinoko', 'niji', 'ouchi', 'saku']
    for (const id of ids.slice(0, 5)) c().discover(id, { silent: true })
    expect(useQuests.getState().claim('zukan6')).toBe(false) // まだ5種類
    c().discover(ids[5], { silent: true })
    const coins0 = useGame.getState().coins
    expect(useQuests.getState().claim('zukan6')).toBe(true)
    expect(useGame.getState().coins).toBe(coins0 + 12)
    expect(useQuests.getState().claim('zukan6')).toBe(false) // 再受け取り不可
  })
})
