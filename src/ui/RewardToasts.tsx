import { useEffect, useState, type CSSProperties } from 'react'
import { useReward, type Toast, type Confetti } from '../game/fx/rewardStore'

// 画面中央のトースト＋紙吹雪を出す DOM オーバーレイ。
// rewardStore に積まれたイベントを描画し、時間で自動的に片づける。
// prefers-reduced-motion のときは紙吹雪を出さず、トーストも静かに見せる（index.css 側で対応）。

const CONFETTI_COLORS = ['#ff5d5d', '#ffd54a', '#5fd06e', '#5b8def', '#c77dff', '#ff9bce', '#4dd6c8']

// seed から決まる純粋な疑似ランダム（Math.random は使わない＝レンダーが安定）。
const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function ToastView({ data, onDone }: { data: Toast; onDone: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const hold = data.kind === 'levelup' || data.kind === 'goal' ? 1900 : 1300
    const t1 = setTimeout(() => setLeaving(true), hold)
    const t2 = setTimeout(() => onDone(data.id), hold + 320)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [data.id, data.kind, onDone])

  return (
    <div className={`reward-toast ${data.kind}${leaving ? ' leaving' : ''}`}>
      {data.emoji && <span className="rt-emoji">{data.emoji}</span>}
      <span>{data.text}</span>
    </div>
  )
}

function ConfettiView({ data, onDone }: { data: Confetti; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(data.id), 1800)
    return () => clearTimeout(t)
  }, [data.id, onDone])

  return (
    <>
      {Array.from({ length: data.n }, (_, i) => {
        const s = data.id * 97 + i * 31 // バーストとピースごとに違う種
        const style: CSSProperties = {
          left: `${Math.round(rand(s) * 100)}%`,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animationDelay: `${(rand(s + 1) * 0.25).toFixed(2)}s`,
          animationDuration: `${(1.2 + rand(s + 2) * 0.5).toFixed(2)}s`,
          // 横ドリフトは keyframe が var(--dx) で使う
          ['--dx' as string]: `${Math.round((rand(s + 3) - 0.5) * 120)}px`,
        }
        return <span key={i} className="confetti-piece" style={style} />
      })}
    </>
  )
}

export function RewardToasts() {
  const toasts = useReward((s) => s.toasts)
  const confetti = useReward((s) => s.confetti)
  const removeToast = useReward((s) => s.removeToast)
  const removeConfetti = useReward((s) => s.removeConfetti)

  return (
    <div className="reward-layer" aria-hidden="true">
      {confetti.map((c) => (
        <ConfettiView key={c.id} data={c} onDone={removeConfetti} />
      ))}
      {toasts.map((t) => (
        <ToastView key={t.id} data={t} onDone={removeToast} />
      ))}
    </div>
  )
}
