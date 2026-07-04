import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useGame } from '../store'

// 画面左上に出る Roblox 風の「ぷっくりピル」ステータス表示。
// レベル / おかね / ブースト を読み取り専用で見せるだけ（クリックは奪わない）。
// スタイルは外部 CSS を使わず全てインラインで自己完結させる。

// ルート: 画面左上にピルを縦に並べる。クリックは下のゲームへ素通り。
const rootStyle: CSSProperties = {
  position: 'fixed',
  top: 12,
  left: 12,
  zIndex: 25,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontFamily:
    '"Rounded Mplus 1c", "Hiragino Maru Gothic ProN", "Segoe UI", system-ui, sans-serif',
  userSelect: 'none',
}

// 各ピルの共通スタイル。色だけ pill ごとに差し替える。
const pillBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  // ぷっくり感: 濃い半透明 + 厚い白フチ + 角丸 + 軽いシャドウ
  borderRadius: 999,
  border: '3px solid rgba(255, 255, 255, 0.95)',
  padding: '6px 16px 6px 12px',
  boxShadow:
    '0 4px 10px rgba(0, 0, 0, 0.30), inset 0 2px 4px rgba(255, 255, 255, 0.25)',
  // 数値が大きくなっても潰れないように最小幅を確保し、内容は左寄せ。
  minWidth: 92,
  whiteSpace: 'nowrap',
  color: '#ffffff',
  textShadow: '0 2px 3px rgba(0, 0, 0, 0.45)',
}

// 絵文字（大きめでくっきり）
const emojiStyle: CSSProperties = {
  fontSize: 26,
  lineHeight: 1,
  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35))',
}

// 数字・ラベル（太字で読みやすく）
const valueStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: 0.3,
}

export function StatusBar() {
  const coins = useGame((s) => s.coins)
  const level = useGame((s) => s.level)
  const boost = useGame((s) => s.boost)
  const lifetime = useGame((s) => s.lifetimeCoins)
  // 次のレベルまでの進み具合（累計12コインごとに1レベル）
  const lvPct = Math.round(((lifetime % 12) / 12) * 100)

  // コイン数は rAF でなめらかに増やし、変化のたびにポンッと弾ませる（死にコード .coin-num を再生）。
  const [display, setDisplay] = useState(coins)
  const [pulse, setPulse] = useState(0)
  const prevRef = useRef(coins)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const from = prevRef.current
    prevRef.current = coins
    if (from === coins) return
    setPulse((p) => p + 1)
    const start = performance.now()
    const DUR = 300
    const tick = (n: number) => {
      const t = Math.min(1, (n - start) / DUR)
      const eased = 1 - (1 - t) * (1 - t)
      setDisplay(Math.round(from + (coins - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else setDisplay(coins)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [coins])

  // 3桁ごとにカンマ（必須ではないが大きい数でも読みやすく）
  const coinsText = display.toLocaleString('en-US')

  return (
    <div style={rootStyle} aria-hidden="true">
      {/* 🏊 レベル: 元気な青 */}
      <div
        data-testid="status-level"
        style={{
          ...pillBase,
          background: 'rgba(33, 118, 255, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        <span style={emojiStyle}>🏊</span>
        <span style={valueStyle}>Lv.{level}</span>
      </div>

      {/* つぎのレベルまでの細いバー（Lvピルの下・少し右に寄せる） */}
      <div
        aria-hidden="true"
        style={{
          width: 96,
          height: 9,
          marginTop: -3,
          marginLeft: 6,
          borderRadius: 999,
          background: 'rgba(0, 0, 0, 0.28)',
          border: '2px solid rgba(255, 255, 255, 0.9)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${lvPct}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #8ef0a6, #22c55e)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* 💰 おかね: ぴかぴか金色 */}
      <div
        data-testid="status-coins"
        style={{
          ...pillBase,
          background: 'rgba(245, 158, 11, 0.88)',
        }}
      >
        <span style={emojiStyle}>💰</span>
        <span key={pulse} className="coin-num" style={valueStyle}>
          {coinsText}
        </span>
      </div>

      {/* ⭐ ブースト: わくわく紫 */}
      <div
        data-testid="status-boost"
        style={{
          ...pillBase,
          background: 'rgba(147, 51, 234, 0.85)',
        }}
      >
        <span style={emojiStyle}>⭐</span>
        <span style={valueStyle}>+{boost}%</span>
      </div>
    </div>
  )
}
