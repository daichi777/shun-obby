// 子供向けUI: 中央クロスヘア + 下部ホットバー（ブロック選択）+ かんたんな あそびかた。
// DOM オーバーレイ（Canvas の外）。

import { useVoxel } from '../game/voxel/voxelStore'
import { getBlock } from '../game/voxel/blocks'

export function VoxelHud() {
  const hotbar = useVoxel((s) => s.hotbar)
  const selectedBlockId = useVoxel((s) => s.selectedBlockId)
  const selectBlock = useVoxel((s) => s.selectBlock)
  const fly = useVoxel((s) => s.fly)
  const toggleFly = useVoxel((s) => s.toggleFly)

  return (
    <>
      {/* クロスヘア */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          width: 24,
          height: 24,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      >
        <div style={{ position: 'absolute', left: 11, top: 2, width: 2, height: 20, background: 'rgba(255,255,255,0.85)', boxShadow: '0 0 2px #000' }} />
        <div style={{ position: 'absolute', left: 2, top: 11, width: 20, height: 2, background: 'rgba(255,255,255,0.85)', boxShadow: '0 0 2px #000' }} />
      </div>

      {/* あそびかた */}
      <div
        style={{
          position: 'fixed',
          left: 12,
          top: 12,
          zIndex: 20,
          color: '#fff',
          fontFamily: 'sans-serif',
          fontSize: 14,
          lineHeight: 1.6,
          textShadow: '0 1px 2px #000',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        🖱️ がめんを クリックすると あそべるよ
        <br />
        WASD うごく / スペース ジャンプ
        <br />
        ひだりクリック=こわす / みぎクリック=おく
        <br />
        🔢 1〜9キー か マウスホイール で ブロックを えらぶ
        <br />F キー = とぶ {fly ? '(オン)' : '(オフ)'} / Esc で マウスを だす
      </div>

      {/* ホットバー */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 14,
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          padding: 6,
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 12,
          zIndex: 20,
        }}
      >
        {hotbar.map((id, i) => {
          const b = getBlock(id)
          const selected = id === selectedBlockId
          const num = i < 9 ? String(i + 1) : i === 9 ? '0' : ''
          return (
            <button
              key={id}
              onClick={() => selectBlock(id)}
              title={`${b.displayName}（${num}キー）`}
              style={{
                position: 'relative',
                width: 48,
                height: 48,
                borderRadius: 10,
                border: selected ? '3px solid #ffe44d' : '3px solid rgba(255,255,255,0.25)',
                background: '#' + b.colorSide.toString(16).padStart(6, '0'),
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: selected ? '0 0 10px #ffe44d' : 'none',
              }}
            >
              <span style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}>{b.emoji}</span>
              {num && (
                <span
                  style={{
                    position: 'absolute',
                    top: 1,
                    left: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 1px 2px #000',
                  }}
                >
                  {num}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={toggleFly}
          title="とぶ"
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            border: fly ? '3px solid #7fdfff' : '3px solid rgba(255,255,255,0.25)',
            background: fly ? '#2b6cb0' : 'rgba(255,255,255,0.1)',
            cursor: 'pointer',
            fontSize: 22,
          }}
        >
          🕊️
        </button>
      </div>
    </>
  )
}
