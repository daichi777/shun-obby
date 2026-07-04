import { useEffect } from 'react'
import { useGame } from '../store'
import { celebrate, burstConfetti } from './fx/rewardStore'
import { sparkleAt } from './fx/fxStore'
import { playClear } from './audio'
import { playerSignal } from './playerSignal'
import { triggerCelebratePose } from './celebrateSignal'

// レベルアップを「事件」にする見えないウォッチャー。
// store.pendingLevelUp が立った瞬間に、お祝いカード＋紙吹雪＋ファンファーレ＋
// ボーナスコイン＋足元スパークルリング＋キャラのバンザイを一斉発火する。
// （検知は store.collect のみが立て、セーブ復元では立てない＝起動時に誤発火しない）
const LEVELUP_BONUS = 5

export function LevelUpWatcher() {
  const pending = useGame((s) => s.pendingLevelUp)

  useEffect(() => {
    if (!pending) return

    celebrate({ title: 'レベルアップ！', sub: `Lv.${pending}`, emoji: '⭐' })
    burstConfetti(52)
    playClear() // ファンファーレ（誤発火バグ撤去後、ここで正しく使う）
    useGame.getState().addCoins(LEVELUP_BONUS) // おさいふがピョンと増える

    // 足元にキラキラのリング＋キャラのバンザイ
    if (playerSignal.valid) {
      const { x, y, z } = playerSignal
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        sparkleAt(
          [x + Math.cos(a) * 0.8, y + 0.2, z + Math.sin(a) * 0.8],
          i % 2 ? '#ffe14d' : '#7cfc58',
        )
      }
    }
    triggerCelebratePose()

    useGame.getState().clearLevelUp() // 消費（同じレベルアップで二度出さない）
  }, [pending])

  return null
}
