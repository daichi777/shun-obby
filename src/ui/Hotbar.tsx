import { useEffect } from 'react'
import { useBuild } from '../game/build/buildStore'
import { CATALOG } from '../game/build/catalog'

// Roblox風の下部ホットバー。
// 所持アイテム（inventory[id] > 0）を CATALOG の並び順で最大9個、画面下部中央に並べる。
// 数字キー1〜9 or クリックで selectForPlace(id) を呼んで設置モードに入る。
export function Hotbar() {
  const inventory = useBuild((s) => s.inventory)
  const mode = useBuild((s) => s.mode)
  const selectedItemId = useBuild((s) => s.selectedItemId)

  // 表示するスロット：CATALOG順で所持しているものだけ、先頭から最大9個。
  const slots = CATALOG.filter((item) => (inventory[item.id] ?? 0) > 0).slice(0, 9)

  // 数字キー Digit1〜Digit9 → そのインデックスの所持アイテムを選択。
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const m = /^Digit([1-9])$/.exec(e.code)
      if (!m) return
      const index = Number(m[1]) - 1 // 1 → 0番目
      // 押下時点の最新の所持アイテムを参照（クロージャの陳腐化を避ける）
      const current = useBuild.getState().inventory
      const list = CATALOG.filter((item) => (current[item.id] ?? 0) > 0).slice(0, 9)
      const target = list[index]
      if (!target) return // 該当が無ければ無視
      useBuild.getState().selectForPlace(target.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // 所持0個なら何も表示しない。
  if (slots.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 14,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 10,
        zIndex: 28,
        pointerEvents: 'none',
      }}
    >
      {slots.map((item, i) => {
        const count = inventory[item.id] ?? 0
        const isSelected = mode === 'placing' && selectedItemId === item.id
        return (
          <button
            key={item.id}
            type="button"
            data-testid={`hotbar-${item.id}`}
            onClick={() => useBuild.getState().selectForPlace(item.id)}
            title={item.name}
            style={{
              pointerEvents: 'auto',
              position: 'relative',
              width: 64,
              height: 64,
              padding: 0,
              borderRadius: 14,
              border: isSelected ? '4px solid #ffd83d' : '4px solid #ffffff',
              background: isSelected
                ? 'linear-gradient(180deg, #fff6cf 0%, #ffe79a 100%)'
                : 'linear-gradient(180deg, #ffffff 0%, #e9eef5 100%)',
              boxShadow: isSelected
                ? '0 0 0 3px rgba(255,176,0,0.45), 0 6px 14px rgba(0,0,0,0.30)'
                : '0 4px 10px rgba(0,0,0,0.25)',
              transform: isSelected ? 'scale(1.18)' : 'scale(1)',
              transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'system-ui, sans-serif',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* 番号バッジ（左上） */}
            <span
              style={{
                position: 'absolute',
                top: -8,
                left: -8,
                minWidth: 22,
                height: 22,
                padding: '0 5px',
                borderRadius: 11,
                background: '#3a3f4b',
                color: '#ffffff',
                border: '2px solid #ffffff',
                fontSize: 13,
                fontWeight: 800,
                lineHeight: '20px',
                textAlign: 'center',
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            >
              {i + 1}
            </span>

            {/* 絵文字（大きめ） */}
            <span style={{ fontSize: 34, lineHeight: 1, pointerEvents: 'none' }}>
              {item.emoji}
            </span>

            {/* 個数バッジ（右下） */}
            <span
              style={{
                position: 'absolute',
                bottom: -7,
                right: -6,
                minWidth: 24,
                height: 20,
                padding: '0 6px',
                borderRadius: 10,
                background: '#2e8b57',
                color: '#ffffff',
                border: '2px solid #ffffff',
                fontSize: 12,
                fontWeight: 800,
                lineHeight: '16px',
                textAlign: 'center',
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            >
              ×{count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
