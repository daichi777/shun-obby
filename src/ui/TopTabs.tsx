import { useState } from 'react'
import { TABS, useUI } from './uiStore'
import { useBuild } from '../game/build/buildStore'

// 画面上部中央にならぶ Roblox 風の大きな丸タブ（HTMLオーバーレイ）。
// クリックでショップのカテゴリを切り替え、ショップを開く。5歳児向けに
// でかく・まるく・あつい白フチ＋濃いめのドロップシャドウで「押せる！」を強調。
export function TopTabs() {
  const shopTab = useUI((s) => s.shopTab)
  // どのタブを押下中か（おしてる間だけ「ぐっ」と沈む）
  const [pressedKey, setPressedKey] = useState<string | null>(null)

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 'clamp(8px, 2.5vw, 20px)',
        zIndex: 30,
        // 親はクリックを素通り。各タブだけがクリックを受ける。
        pointerEvents: 'none',
        // セーフエリア & 横はみ出し防止
        padding: '0 12px',
        boxSizing: 'border-box',
      }}
    >
      {TABS.map((tab) => {
        const selected = shopTab === tab.key
        const pressed = pressedKey === tab.key

        const handleActivate = () => {
          useUI.getState().setShopTab(tab.key)
          useBuild.getState().openShop()
        }

        return (
          <button
            key={tab.key}
            type="button"
            data-testid={`tab-${tab.key}`}
            aria-label={tab.label}
            aria-pressed={selected}
            onClick={handleActivate}
            onPointerDown={() => setPressedKey(tab.key)}
            onPointerUp={() => setPressedKey(null)}
            onPointerLeave={() => setPressedKey(null)}
            onPointerCancel={() => setPressedKey(null)}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              // 丸っこい四角（ピル）。選択中はひとまわり大きく。
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minWidth: selected ? 96 : 84,
              padding: '10px 16px',
              borderRadius: 26,
              // あつい白フチ（選択中はすこし太く）
              border: `${selected ? 4 : 3}px solid #ffffff`,
              background: tab.color,
              color: '#ffffff',
              fontFamily:
                '"Hiragino Maru Gothic ProN", "Hiragino Kaku Gothic ProN", system-ui, sans-serif',
              fontWeight: 800,
              // 文字に縁取りっぽい影をつけて読みやすく
              textShadow: '0 2px 0 rgba(0,0,0,0.28)',
              // 濃いめのドロップシャドウ＋選択中は色つきグロー
              boxShadow: selected
                ? `0 8px 0 rgba(0,0,0,0.22), 0 0 0 4px rgba(255,255,255,0.55), 0 0 22px 4px ${tab.color}`
                : '0 6px 0 rgba(0,0,0,0.22), 0 6px 14px rgba(0,0,0,0.28)',
              // 選択中は明るく、押すと沈む（弾む）。
              filter: selected ? 'brightness(1.12) saturate(1.05)' : 'brightness(1)',
              transform: pressed
                ? 'translateY(3px) scale(0.96)'
                : selected
                ? 'translateY(0) scale(1.08)'
                : 'translateY(0) scale(1)',
              transition: 'transform 120ms cubic-bezier(.34,1.56,.64,1), box-shadow 120ms ease, filter 120ms ease',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              touchAction: 'manipulation',
              outline: 'none',
            }}
          >
            <span
              aria-hidden
              style={{
                fontSize: selected ? 30 : 26,
                lineHeight: 1,
                // 絵文字にも軽い影で立体感
                filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.25))',
                transition: 'font-size 120ms ease',
              }}
            >
              {tab.emoji}
            </span>
            <span
              style={{
                fontSize: 'clamp(13px, 3.4vw, 16px)',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                letterSpacing: 0.5,
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
