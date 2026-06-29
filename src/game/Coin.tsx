import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../store'
import { COINS, type Vec3 } from './level'
import { playCoin, notifyCoinCollected } from './audio'
import { sparkleAt } from './fx/fxStore'

// 取ってから復活するまでの時間（短め）。何度でも集められる。
const RESPAWN_MS = 5000

// くるくる回る金貨。プレイヤーが触れる(センサーが重なる)と取得してきえ、
// しばらくすると同じ場所にポンッと復活する。
export function Coin({ position }: { position: Vec3 }) {
  const [collected, setCollected] = useState(false)
  const spinRef = useRef<THREE.Group>(null)
  const firedRef = useRef(false) // 物理イベントが二重発火しても取得は1回だけ
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAppear = useRef(false) // 復活直後フレームでポップ開始時刻を記録するため
  const appearStart = useRef(0) // 0 = 初期配置（ポップなし）
  const collect = useGame((s) => s.collect)

  // アンマウント時にタイマーを片づける（取得直後にunmountしても安全）
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useFrame((state, dt) => {
    const g = spinRef.current
    if (!g) return
    g.rotation.y += dt * 2.2
    // 復活したフレームで開始時刻を記録
    if (pendingAppear.current) {
      appearStart.current = state.clock.elapsedTime
      pendingAppear.current = false
    }
    // ポップイン(0→1) ＋ ふわふわ
    const pop =
      appearStart.current === 0
        ? 1
        : Math.min(1, (state.clock.elapsedTime - appearStart.current) / 0.28)
    const floaty = 0.96 + Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.06
    g.scale.setScalar(pop * floaty)
  })

  if (collected) return null

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
      onIntersectionEnter={() => {
        if (firedRef.current) return
        firedRef.current = true
        setCollected(true)
        collect()
        playCoin()
        sparkleAt(position, '#ffd54a')
        notifyCoinCollected(COINS.length)
        // 短いスパンで復活（取得をリセット＋ポップ再生）
        timer.current = setTimeout(() => {
          firedRef.current = false
          pendingAppear.current = true
          setCollected(false)
          sparkleAt(position, '#fff7c2')
        }, RESPAWN_MS)
      }}
    >
      {/* とりやすいように当たり判定はすこし大きめ(センサー) */}
      <BallCollider args={[0.7]} sensor />
      <group ref={spinRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.12, 24]} />
          <meshStandardMaterial
            color="#ffd54a"
            metalness={0.6}
            roughness={0.25}
            emissive="#a07b00"
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>
    </RigidBody>
  )
}
