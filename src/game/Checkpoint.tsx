import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import * as THREE from 'three'
import type { Vec3 } from './level'
import { useCheckpoint, nextCheckpointId } from './checkpoint/checkpointStore'
import { sparkleAt } from './fx/fxStore'
import { playCheckpoint } from './audio'
import { PALETTE } from './design/palette'

// 緑に光るセーフパッド＋はた。プレイヤーが触れると「ここから復活」に登録され、
// 高いところから落ちても直近のここへポンッと戻れる（復帰処理は Player.tsx）。
// position = パッド天面のワールド座標（足場の天面に置く）。r = 着地キャッチ半径。
export function Checkpoint({ position, r = 13 }: { position: Vec3; r?: number }) {
  const id = useMemo(() => nextCheckpointId(), [])
  const isActive = useCheckpoint((s) => s.active?.id === id)
  const flagRef = useRef<THREE.Group>(null)
  const [x, y, z] = position

  useFrame((state) => {
    // アクティブ時ははたが元気にゆれる（今どこが有効かを見せる）
    const g = flagRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    g.rotation.z = (isActive ? 0.13 : 0.04) * Math.sin(t * (isActive ? 4 : 1.5))
  })

  const emissive = isActive ? 1.1 : 0.32

  return (
    <>
      {/* 触れると記録するセンサー（プレイヤーのカプセルだけを見る） */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[x, y + 1.0, z]}
        onIntersectionEnter={(e) => {
          // 足場やコイン等の他センサーで誤発火しないよう、プレイヤー本体だけ判定
          if (e.other.rigidBodyObject?.name !== 'player') return
          const st = useCheckpoint.getState()
          if (st.active?.id === id) return // すでにここが有効なら何もしない
          st.set({ id, x, y, z, r })
          sparkleAt([x, y + 0.7, z], '#7cfc58')
          playCheckpoint()
        }}
      >
        <BallCollider args={[1.4]} sensor />
      </RigidBody>

      {/* 見た目（当たり判定なし） */}
      <group position={[x, y, z]}>
        {/* 緑に光るパッド */}
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[1.15, 1.28, 0.12, 24]} />
          <meshStandardMaterial color={PALETTE.safe} emissive={PALETTE.safeGlow} emissiveIntensity={emissive} />
        </mesh>
        {/* はた（ポール＋旗） */}
        <group ref={flagRef} position={[0, 0.12, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.09, 1.8, 0.09]} />
            <meshStandardMaterial color="#eafaf0" />
          </mesh>
          <mesh position={[0.42, 1.5, 0]} castShadow>
            <boxGeometry args={[0.7, 0.45, 0.04]} />
            <meshStandardMaterial
              color={PALETTE.safe}
              emissive={PALETTE.safeGlow}
              emissiveIntensity={isActive ? 0.7 : 0.2}
            />
          </mesh>
        </group>
      </group>
    </>
  )
}
