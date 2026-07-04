import { useEffect, useState } from 'react'
import { useReward, type Celebration } from '../game/fx/rewardStore'

// 画面中央にドンと出る大きなお祝いカード（レベルアップ／ゴール到達など）。
// rewardStore.celebrate() で発火し、溜め→解放でポンッと出て ~2.5s で自動退場する。
// 紙吹雪・ファンファーレ・ボーナスは呼び出し側（LevelUpWatcher 等）が同時に出す。

// カード本体（お祝いごとに key で作り直す＝leaving を毎回 false から始められる）。
function CelebrationCard({ data, onDone }: { data: Celebration; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2100)
    const t2 = setTimeout(onDone, 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div className="celebrate-layer" aria-hidden="true">
      <div className={`celebrate-card${leaving ? ' leaving' : ''}`}>
        {data.emoji && <div className="celebrate-emoji">{data.emoji}</div>}
        <div className="celebrate-title">{data.title}</div>
        {data.sub && <div className="celebrate-sub">{data.sub}</div>}
      </div>
    </div>
  )
}

export function CelebrationOverlay() {
  const c = useReward((s) => s.celebration)
  const clear = useReward((s) => s.clearCelebration)
  if (!c) return null
  return <CelebrationCard key={c.id} data={c} onDone={clear} />
}
