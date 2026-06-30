import type { CSSProperties } from 'react'
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

  // 3桁ごとにカンマ（必須ではないが大きい数でも読みやすく）
  const coinsText = coins.toLocaleString('en-US')

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

      {/* 💰 おかね: ぴかぴか金色 */}
      <div
        data-testid="status-coins"
        style={{
          ...pillBase,
          background: 'rgba(245, 158, 11, 0.88)',
        }}
      >
        <span style={emojiStyle}>💰</span>
        <span style={valueStyle}>{coinsText}</span>
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
