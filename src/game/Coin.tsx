import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../store'
import { type Vec3 } from './level'
import { onCoinCollected } from './fx/rewardStore'
import { sparkleAt } from './fx/fxStore'
import { playerSignal } from './playerSignal'

// 取ってから復活するまでの時間（短め）。何度でも集められる。
const RESPAWN_MS = 5000
// 取得演出（プレイヤーへ吸い込まれながらポンッと弾けて消える）の長さ。
const COLLECT_MS = 260

// くるくる回る金貨。プレイヤーが触れる(センサーが重なる)と取得してきえ、
// しばらくすると同じ場所にポンッと復活する。
export function Coin({ position }: { position: Vec3 }) {
  const [collected, setCollected] = useState(false)
  const spinRef = useRef<THREE.Group>(null)
  const firedRef = useRef(false) // 物理イベントが二重発火しても取得は1回だけ
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAppear = useRef(false) // 復活直後フレームでポップ開始時刻を記録するため
  const appearStart = useRef(0) // 0 = 初期配置（ポップなし）
  const collectStart = useRef(0) // -1=取得した(次フレームで開始時刻を入れる) / >0=吸込み演出中
  const collect = useGame((s) => s.collect)

  // アンマウント時にタイマーを片づける（取得直後にunmountしても安全）
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useFrame((state, dt) => {
    const g = spinRef.current
    if (!g) return
    g.rotation.y += dt * 2.2

    // --- 取得演出（プレイヤーへ吸着しながらポンッ→しぼんで消滅）---
    if (collectStart.current !== 0) {
      if (collectStart.current < 0) collectStart.current = state.clock.elapsedTime
      const t = Math.min(1, (state.clock.elapsedTime - collectStart.current) / (COLLECT_MS / 1000))
      const e = t * t // だんだん速く吸い込まれる
      // プレイヤー方向へローカルオフセット（ワールド差分をそのまま局所座標に流用）
      const tx = playerSignal.valid ? playerSignal.x - position[0] : 0
      const ty = (playerSignal.valid ? playerSignal.y + 0.6 - position[1] : 0.8)
      const tz = playerSignal.valid ? playerSignal.z - position[2] : 0
      g.position.set(tx * e, ty * e, tz * e)
      const pop = t < 0.35 ? 1 + (t / 0.35) * 0.5 : 1.5 * (1 - (t - 0.35) / 0.65)
      g.scale.setScalar(Math.max(0.001, pop))
      if (t >= 1) {
        collectStart.current = 0
        g.position.set(0, 0, 0)
        setCollected(true)
        // 短いスパンで復活（取得をリセット＋ポップ再生）
        timer.current = setTimeout(() => {
          firedRef.current = false
          pendingAppear.current = true
          setCollected(false)
          sparkleAt(position, '#fff7c2')
        }, RESPAWN_MS)
      }
      return
    }

    // --- 通常（回転＋ポップイン＋ふわふわ）---
    if (pendingAppear.current) {
      appearStart.current = state.clock.elapsedTime
      pendingAppear.current = false
    }
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
      onIntersectionEnter={(e) => {
        // プレイヤー本体だけ判定。動く床(kinematic)が通過しただけで
        // 「取得」扱いになり、勝手にお金が増える誤発火を防ぐ。
        if (e.other.rigidBodyObject?.name !== 'player') return
        if (firedRef.current || collectStart.current !== 0) return
        firedRef.current = true
        const gain = collect()
        onCoinCollected(position, gain) // 音（コンボ音程）＋「+N」＋れんぞくボーナス
        sparkleAt(position, '#ffd54a')
        collectStart.current = -1 // 次フレームから吸込み演出を開始
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
