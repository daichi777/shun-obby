import { useQuestProgress, useQuests } from '../game/quests/questStore'

// ごほうびクエストパネル（画面右側・縦積み）。Roblox風の濃い青カード＋白フチ。
// 5歳児向けに大きく・はっきり。クリックは「もらう！」ボタンだけ受け取る。
export function QuestPanel() {
  const quests = useQuestProgress()
  const claim = useQuests((s) => s.claim)

  return (
    <div style={rootStyle}>
      <div style={titleStyle}>🎁 ごほうび</div>
      {quests.map((q) => {
        const ratio = q.goal > 0 ? Math.min(q.progress / q.goal, 1) : 0
        const pct = Math.round(ratio * 100)
        return (
          <div key={q.id} data-testid={`quest-${q.id}`} style={cardStyle(q.claimed)}>
            {/* 上段：絵文字 + 説明 + ごほうび */}
            <div style={topRowStyle}>
              <span style={iconStyle}>{q.icon}</span>
              <span style={labelStyle}>{q.label}</span>
              <span style={rewardStyle}>🪙{q.reward}</span>
            </div>

            {/* 進捗バー */}
            <div style={barTrackStyle}>
              <div style={barFillStyle(pct, q.done)} />
              <span style={barTextStyle}>
                {q.progress}/{q.goal}
              </span>
            </div>

            {/* 下段：状態（もらう！ボタン or 済み or がんばろう） */}
            {q.claimed ? (
              <div style={claimedStyle}>✓ もらった！</div>
            ) : q.done ? (
              <button
                type="button"
                data-testid={`claim-${q.id}`}
                style={claimButtonStyle}
                onClick={() => claim(q.id)}
              >
                ✨ もらう！ ✨
              </button>
            ) : (
              <div style={progressHintStyle}>がんばろう！</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ===== styles（全部インライン・自己完結） =====

const rootStyle: React.CSSProperties = {
  position: 'fixed',
  right: 10,
  top: 90,
  width: 230,
  zIndex: 25,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  pointerEvents: 'none',
  fontFamily: '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", system-ui, sans-serif',
}

const titleStyle: React.CSSProperties = {
  alignSelf: 'flex-end',
  color: '#fff',
  fontSize: 20,
  fontWeight: 900,
  textShadow: '0 2px 0 #1a3a8a, 0 0 6px rgba(0,0,0,0.4)',
  WebkitTextStroke: '1px #1a3a8a',
}

function cardStyle(claimed: boolean): React.CSSProperties {
  return {
    background: claimed
      ? 'linear-gradient(180deg, #4a5670 0%, #353e54 100%)'
      : 'linear-gradient(180deg, #2f6bff 0%, #1f49c4 100%)',
    border: '3px solid #ffffff',
    borderRadius: 16,
    padding: '8px 10px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
    opacity: claimed ? 0.65 : 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }
}

const topRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const iconStyle: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 1,
  flexShrink: 0,
}

const labelStyle: React.CSSProperties = {
  flex: 1,
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.2,
  textShadow: '0 1px 0 rgba(0,0,0,0.3)',
}

const rewardStyle: React.CSSProperties = {
  flexShrink: 0,
  color: '#ffe45a',
  fontSize: 15,
  fontWeight: 900,
  textShadow: '0 1px 0 #7a5a00',
  whiteSpace: 'nowrap',
}

const barTrackStyle: React.CSSProperties = {
  position: 'relative',
  height: 18,
  borderRadius: 999,
  background: 'rgba(0,0,0,0.30)',
  border: '2px solid rgba(255,255,255,0.85)',
  overflow: 'hidden',
}

function barFillStyle(pct: number, done: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: `${pct}%`,
    background: done
      ? 'linear-gradient(180deg, #7dff8a 0%, #2fd44a 100%)'
      : 'linear-gradient(180deg, #56e06a 0%, #2aa83f 100%)',
    boxShadow: done ? '0 0 8px #9dff9d' : 'none',
    transition: 'width 0.25s ease',
  }
}

const barTextStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: 12,
  fontWeight: 900,
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
}

const claimButtonStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  border: '3px solid #fff',
  borderRadius: 12,
  padding: '8px 6px',
  background: 'linear-gradient(180deg, #ffd83a 0%, #ff9e1b 100%)',
  color: '#7a3a00',
  fontSize: 16,
  fontWeight: 900,
  textShadow: '0 1px 0 rgba(255,255,255,0.5)',
  boxShadow: '0 0 16px #ffd83a, 0 0 6px #fff, 0 3px 6px rgba(0,0,0,0.3)',
}

const claimedStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#d8ffd8',
  fontSize: 14,
  fontWeight: 900,
  textShadow: '0 1px 0 rgba(0,0,0,0.3)',
}

const progressHintStyle: React.CSSProperties = {
  textAlign: 'center',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 12,
  fontWeight: 800,
}
