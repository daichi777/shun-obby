import { useEffect, useState } from 'react'
import { useBuild } from '../game/build/buildStore'
import { isCoarsePointer } from './mobile/touchStore'
import { triggerEmote, currentEmote, type EmoteKind } from '../game/emote/emoteSignal'
import { playEmote } from '../game/audio'

// 😊 エモートホイール（右下）。ボタンをおすと4つのエモートがポップアップし、
// えらぶとキャラがポーズ＋エフェクト（CharacterModel が emoteSignal を読む）。
// 文字がよめなくても絵文字でわかる。タッチでもマウスでもOK。あそびモード中のみ表示。

const EMOTES: { kind: EmoteKind; emoji: string; label: string }[] = [
  { kind: 'wave', emoji: '👋', label: 'てをふる' },
  { kind: 'banzai', emoji: '🙌', label: 'ばんざい' },
  { kind: 'dance', emoji: '💃', label: 'だんす' },
  { kind: 'heart', emoji: '❤️', label: 'はーと' },
]

export function EmoteWheel() {
  const [open, setOpen] = useState(false)
  // タッチ端末か（初期化時に一度だけ判定。SSRなしの Vite クライアント前提）
  const [coarse] = useState(() => isCoarsePointer())
  const mode = useBuild((s) => s.mode)

  // Playwright 検証用フック（__game.emote）
  useEffect(() => {
    const w = window as unknown as { __game?: Record<string, unknown> }
    w.__game = w.__game ?? {}
    w.__game.emote = {
      trigger: (k: EmoteKind) => triggerEmote(k),
      current: () => currentEmote(),
    }
  }, [])

  if (mode !== 'play') return null

  const pick = (kind: EmoteKind) => {
    triggerEmote(kind)
    playEmote()
    setOpen(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        // タッチ端末はジャンプボタン（right:28/bottom:120/96px）の上、
        // デスクトップはごほうびパネルの下（重なり回避を実測で確認済み）
        right: coarse ? 28 : 16,
        bottom: coarse ? 232 : 52,
        zIndex: 28,
        display: 'flex',
        // 右のごほうびパネルと重ならないよう、左（ゲーム画面側）へ横に開く
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        fontFamily: '"Hiragino Maru Gothic ProN", "Comic Sans MS", system-ui, sans-serif',
      }}
    >
      {/* トグルボタン */}
      <button
        type="button"
        data-testid="emote-toggle"
        aria-label="エモート"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          border: '4px solid #ffffff',
          background: open
            ? 'linear-gradient(180deg, #fff6cf 0%, #ffe79a 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #e9eef5 100%)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
          fontSize: 30,
          lineHeight: 1,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        😊
      </button>

      {/* エモートのポップアップ（上に伸びる） */}
      {open &&
        EMOTES.map((e, i) => (
          <button
            key={e.kind}
            type="button"
            data-testid={`emote-${e.kind}`}
            title={e.label}
            onClick={() => pick(e.kind)}
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: '3px solid #ffffff',
              background: 'linear-gradient(180deg, #ffffff 0%, #ffe9f2 100%)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.22)',
              fontSize: 26,
              lineHeight: 1,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              animation: `emote-pop 160ms ease ${i * 40}ms backwards`,
            }}
          >
            {e.emoji}
          </button>
        ))}
      {/* ポップアニメ（インラインでキーフレームを注入） */}
      <style>{`@keyframes emote-pop { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  )
}
