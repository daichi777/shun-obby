import { useUI } from './uiStore'
import { CATALOG } from '../game/build/catalog'
import { useBuild } from '../game/build/buildStore'
import type { Category } from '../game/build/itemTypes'

// あつめた図鑑（ずかん）。全アイテムを一覧し、手に入れた/置いたものは「あつめた！」、
// まだのものは「？」で表示する。5歳児向けに大きくポップなRoblox風モーダル。

// カテゴリの見出し定義（fun=スライド系/nature/building）。表示順もこの配列順。
const SECTIONS: { key: Category; label: string; emoji: string; color: string }[] = [
  { key: 'fun', label: 'スライド', emoji: '🛝', color: '#ff4d4d' },
  { key: 'nature', label: 'こうえん', emoji: '🌳', color: '#3aa0ff' },
  { key: 'building', label: 'デコレーション', emoji: '🎨', color: '#ffc02e' },
]

export function IndexPanel() {
  const open = useUI((s) => s.indexOpen)
  const inventory = useBuild((s) => s.inventory)
  const placed = useBuild((s) => s.placed)

  if (open === false) return null

  // 「あつめた」判定: 在庫が1つ以上 or 設置済みに同じitemIdがある。
  const isCollected = (id: string): boolean =>
    (inventory[id] ?? 0) > 0 || placed.some((p) => p.itemId === id)

  const total = CATALOG.length
  const collectedCount = CATALOG.reduce((n, item) => n + (isCollected(item.id) ? 1 : 0), 0)

  const closePanel = () => useUI.getState().setIndexOpen(false)

  return (
    <div
      data-testid="index-panel"
      onClick={closePanel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        background: 'rgba(0,0,0,0.5)',
        padding: 16,
        boxSizing: 'border-box',
        fontFamily: '"Hiragino Maru Gothic ProN", "Comic Sans MS", system-ui, sans-serif',
      }}
    >
      {/* パネル本体。背景クリックで閉じるが、本体クリックは伝播を止める。 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(720px, 94vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: '#fff7ea',
          border: '8px solid #ffffff',
          borderRadius: 28,
          boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
          padding: 20,
          boxSizing: 'border-box',
        }}
      >
        {/* 閉じるボタン（右上） */}
        <button
          data-testid="index-close"
          onClick={closePanel}
          aria-label="とじる"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '4px solid #ffffff',
            background: '#ff5d5d',
            color: '#fff',
            fontSize: 24,
            fontWeight: 900,
            cursor: 'pointer',
            lineHeight: 1,
            boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
          }}
        >
          ✖
        </button>

        {/* タイトル + 進捗 */}
        <div style={{ textAlign: 'center', marginBottom: 16, paddingRight: 48 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#5a3d1f' }}>📖 ずかん</div>
          <div
            style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '6px 18px',
              borderRadius: 999,
              background: '#ffd66b',
              border: '4px solid #ffffff',
              color: '#6b4a17',
              fontSize: 20,
              fontWeight: 900,
            }}
          >
            あつめた {collectedCount} / 全 {total}
          </div>
        </div>

        {/* カテゴリごとの区切り */}
        {SECTIONS.map((section) => {
          const items = CATALOG.filter((i) => i.category === section.key)
          if (items.length === 0) return null
          return (
            <div key={section.key} style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: '6px 4px 10px',
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#fff',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 14px',
                    borderRadius: 999,
                    background: section.color,
                    border: '3px solid #ffffff',
                    boxShadow: '0 3px 0 rgba(0,0,0,0.15)',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{section.emoji}</span>
                  {section.label}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                  gap: 12,
                }}
              >
                {items.map((item) => {
                  const got = isCollected(item.id)
                  return (
                    <div
                      key={item.id}
                      data-testid={`index-${item.id}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        padding: '12px 6px',
                        minHeight: 110,
                        borderRadius: 18,
                        border: '4px solid #ffffff',
                        background: got ? '#ffffff' : '#e9e4da',
                        opacity: got ? 1 : 0.7,
                        boxShadow: got
                          ? '0 5px 0 rgba(0,0,0,0.12)'
                          : 'inset 0 0 0 0 transparent',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 40, lineHeight: 1 }}>
                        {got ? item.emoji : '❓'}
                      </div>
                      {got ? (
                        <>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 900,
                              color: '#5a3d1f',
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 900,
                              color: '#2faa4f',
                            }}
                          >
                            ✓ あつめた！
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 900,
                            color: '#9a948a',
                          }}
                        >
                          ？
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
