import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import * as THREE from 'three'
import type { Vec3 } from './level'
import { useCheckpoint, nextCheckpointId } from './checkpoint/checkpointStore'
import { useProgress } from './progress/progressStore'
import { sparkleAt } from './fx/fxStore'
import { celebrate, burstConfetti } from './fx/rewardStore'
import { playClear, playCheckpoint } from './audio'
import { useGame } from '../store'
import { PALETTE } from './design/palette'

// エリアの「ゴール」。遠くから見える発光ポール＋大きな旗＋浮く絵文字。
// プレイヤーが触れると初クリアで大お祝い（[5]の celebrate＋紙吹雪＋ファンファーレ＋
// ボーナス＋スパークルリング）。ゴールは最高到達点なので復活地点(checkpoint)にも登録する。
const GOAL_BONUS = 8

// 浮かぶ絵文字のビルボード（CanvasTexture でコード生成・外部画像なし）。
const emojiTexCache = new Map<string, THREE.CanvasTexture>()
function emojiTexture(emoji: string): THREE.CanvasTexture {
  const hit = emojiTexCache.get(emoji)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.font = '96px "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 64, 74)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 2
  emojiTexCache.set(emoji, tex)
  return tex
}

export function GoalFlag({
  position,
  area,
  label,
  emoji = '🏁',
  color = PALETTE.goal,
  r = 13,
}: {
  position: Vec3
  area: string
  label: string
  emoji?: string
  color?: string
  r?: number
}) {
  const cpId = useMemo(() => nextCheckpointId(), [])
  const [x, y, z] = position
  const flagRef = useRef<THREE.Group>(null)
  const emojiRef = useRef<THREE.Sprite>(null)
  const tex = useMemo(() => emojiTexture(emoji), [emoji])
  const cleared = useProgress((s) => s.cleared.includes(area))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (flagRef.current) flagRef.current.rotation.z = Math.sin(t * 3) * 0.1
    if (emojiRef.current) emojiRef.current.position.y = 3.4 + Math.sin(t * 2) * 0.18
  })

  return (
    <>
      {/* 到達センサー（プレイヤー本体だけ判定・足場/コインの誤発火を除外） */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[x, y + 1.0, z]}
        onIntersectionEnter={(e) => {
          if (e.other.rigidBodyObject?.name !== 'player') return
          // ゴール＝最高到達点なので復活地点としても登録
          const cs = useCheckpoint.getState()
          if (cs.active?.id !== cpId) cs.set({ id: cpId, x, y, z, r })
          const first = useProgress.getState().markCleared(area)
          if (first) {
            celebrate({ title: 'クリア！', sub: label, emoji: '🎉' })
            burstConfetti(56)
            playClear()
            useGame.getState().addCoins(GOAL_BONUS)
            for (let i = 0; i < 10; i++) {
              const a = (i / 10) * Math.PI * 2
              sparkleAt(
                [x + Math.cos(a) * 1.0, y + 0.4, z + Math.sin(a) * 1.0],
                i % 2 ? color : '#ffffff',
              )
            }
          } else {
            // 再訪はキラッと＋軽い音だけ（お祝いとボーナスは1回きり）
            playCheckpoint()
            sparkleAt([x, y + 0.8, z], color)
          }
        }}
      >
        <BallCollider args={[1.5]} sensor />
      </RigidBody>

      {/* 見た目（当たり判定なし） */}
      <group position={[x, y, z]}>
        {/* ゴール色の丸い台 */}
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[1.25, 1.4, 0.12, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={cleared ? 0.9 : 0.5}
          />
        </mesh>
        {/* 高いポール＋大きな旗（遠くから見える emissive） */}
        <group ref={flagRef} position={[0, 0.12, 0]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[0.12, 3.0, 0.12]} />
            <meshStandardMaterial color="#ffffff" emissive="#fff3c4" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.62, 2.6, 0]} castShadow>
            <boxGeometry args={[1.1, 0.7, 0.05]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} />
          </mesh>
        </group>
        {/* 浮かぶ絵文字 */}
        <sprite ref={emojiRef} position={[0, 3.4, 0]} scale={[1.3, 1.3, 1]}>
          <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
    </>
  )
}
