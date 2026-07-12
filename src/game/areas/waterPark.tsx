import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Coin } from '../Coin'
import { PulseGlow } from '../fx/PulseGlow'
import { FlowingWater } from '../Water'
import { playSplash } from '../audio'
import { sparkleAt } from '../fx/fxStore'
import { playerSignal } from '../playerSignal'
import type { Vec3 } from '../level'

// ============================================================================
// 🌊 ウォーターパーク
// 「滑り台で滑って → 水にバシャーン → プカプカ → 流れるプールで流される」を1か所に。
//
// 配置範囲（右側ミドル帯）: x ∈ [36, 82], z ∈ [12, 29]
//   中央広場 r<15・動く床(z=±6)・slidePark(z≥30)・他象限とは重ならない。
//
// 当たり判定レシピ（厳守・過去のパニック回避）:
//   ・地面(GROUND)は y=0 で全面が固体。だから水は「見た目だけ」を y=0.5 に置けば、
//     プレイヤーは芝生(y=0)に立ったまま水に“入って”見える＝沈まない安心設計。
//   ・歩いて登る坂/足場 = fixed RigidBody + auto cuboid、friction は書かない（既定）。
//   ・滑走面だけ別 RigidBody に数値 friction={0.03}（undefined は絶対渡さない）。
//   ・流れるプールのラフト = kinematicPosition を setNextKinematicTranslation で往復。
//     ecctrl が「動く床」を検知して乗り手を運ぶ（MovingWalkway と同じ実証済み方式）。
// ============================================================================

const WATER_Y = 0.5 // 水面の見た目の高さ（芝生 y=0 の少し上）
const CZ = 16.5 // 滑り台＆プールの中心 z

// ---- プール（着水＆プカプカ）範囲 ----
const POOL = { x0: 48, x1: 70, z0: 12, z1: 21 }
const POOL_CX = (POOL.x0 + POOL.x1) / 2 // 59
const POOL_W = POOL.x1 - POOL.x0 // 22
const POOL_CZ = (POOL.z0 + POOL.z1) / 2 // 16.5
const POOL_D = POOL.z1 - POOL.z0 // 9

// ---- 流れるプール（乗ると流される）範囲 ----
const RIVER = { x0: 36, x1: 82, z0: 23, z1: 29 }
const RIVER_CX = (RIVER.x0 + RIVER.x1) / 2 // 59
const RIVER_W = RIVER.x1 - RIVER.x0 // 46
const RIVER_CZ = (RIVER.z0 + RIVER.z1) / 2 // 26
const RIVER_D = RIVER.z1 - RIVER.z0 // 6

// ============================================================================
// 滑り台タワー（歩いて登る緩い坂 → 上のひろば → 急な滑走面 → プールへ着水）
// ============================================================================
function SlideTower() {
  return (
    <>
      {/* 上のひろば（柱） */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow position={[74, 1.75, CZ]}>
          <boxGeometry args={[4, 3.5, 3.6]} />
          <meshStandardMaterial color="#ffd166" />
        </mesh>
      </RigidBody>

      {/* 登り坂（緩い 0.40rad＝歩いて登れる）。+x 側からてっぺんへ。 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          castShadow
          receiveShadow
          position={[80.14, 1.75, CZ]}
          rotation={[0, 0, -0.4]}
        >
          <boxGeometry args={[9, 0.4, 3.4]} />
          <meshStandardMaterial color="#90be6d" />
        </mesh>
      </RigidBody>
      {/* 坂の手すり（左右・見た目だけ） */}
      {[-1.8, 1.8].map((dz) => (
        <mesh key={dz} position={[80.14, 2.2, CZ + dz]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[9, 0.5, 0.16]} />
          <meshStandardMaterial color="#43aa8b" />
        </mesh>
      ))}

      {/* 滑走面（急な 0.62rad・つるつる friction0.03）。てっぺんからプールへ。 */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.03}>
        <mesh
          castShadow
          receiveShadow
          position={[69.56, 1.76, CZ]}
          rotation={[0, 0, 0.62]}
        >
          <boxGeometry args={[6, 0.5, 3]} />
          <meshStandardMaterial color="#4cc9f0" metalness={0.1} roughness={0.35} />
        </mesh>
      </RigidBody>
      {/* 滑走面の左右のヘリ（落ちないように・見た目＋低い壁） */}
      {[-1.65, 1.65].map((dz) => (
        <RigidBody key={dz} type="fixed" colliders="cuboid">
          <mesh castShadow position={[69.56, 2.1, CZ + dz]} rotation={[0, 0, 0.62]}>
            <boxGeometry args={[6, 0.6, 0.3]} />
            <meshStandardMaterial color="#4895ef" />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}

// ============================================================================
// プール（見た目）：タイルのふち＋水面。あたり判定なし（芝生 y=0 が床）。
// ============================================================================
function Pool() {
  return (
    <group>
      {/* タイルのふち（うすい板・通り抜けOK） */}
      <mesh receiveShadow position={[POOL_CX, 0.02, POOL_CZ]}>
        <boxGeometry args={[POOL_W + 2.4, 0.04, POOL_D + 2.4]} />
        <meshStandardMaterial color="#e8eef5" />
      </mesh>
      {/* 水底（あわい水色） */}
      <mesh receiveShadow position={[POOL_CX, 0.04, POOL_CZ]}>
        <boxGeometry args={[POOL_W, 0.04, POOL_D]} />
        <meshStandardMaterial color="#7fd8f5" />
      </mesh>
      {/* 流れて波打つ水面（見た目だけ） */}
      <FlowingWater
        position={[POOL_CX, WATER_Y, POOL_CZ]}
        size={[POOL_W, POOL_D]}
        flow={[0.03, 0.04]}
        repeat={[3, 2]}
        color="#36b6ef"
        highlight="#d6f3ff"
        opacity={0.8}
        waveHeight={0.1}
      />
    </group>
  )
}

// ============================================================================
// 流れるプール：水面＋不可視の往復ラフト。乗ると端から端まで運ばれる。
// ============================================================================
const RAFT_SPEED = 2.4 // m/s（ゆったり）
const RAFT_X_MIN = 40
const RAFT_X_MAX = 78
const RAFT_HX = 4 // 半長（x）
const RAFT_HY = 0.15
const RAFT_HZ = 2.5 // 半幅（z）＝チャンネル幅にほぼ一杯
const RAFT_CY = 0.1 // 中心 y（天面 0.25：芝生 0 の少し上＝ここに乗ると運ばれる）

function LazyRaft({ startX, dir0 }: { startX: number; dir0: 1 | -1 }) {
  const ref = useRef<RapierRigidBody>(null)
  const x = useRef(startX)
  const dir = useRef<number>(dir0)

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    x.current += dir.current * RAFT_SPEED * d
    if (x.current >= RAFT_X_MAX) {
      x.current = RAFT_X_MAX
      dir.current = -1
    } else if (x.current <= RAFT_X_MIN) {
      x.current = RAFT_X_MIN
      dir.current = 1
    }
    ref.current?.setNextKinematicTranslation({ x: x.current, y: RAFT_CY, z: RIVER_CZ })
  })

  return (
    <RigidBody
      ref={ref}
      type="kinematicPosition"
      colliders={false}
      position={[startX, RAFT_CY, RIVER_CZ]}
    >
      {/* あたり判定（不可視）＝乗ると運ぶ床 */}
      <CuboidCollider args={[RAFT_HX, RAFT_HY, RAFT_HZ]} />
      {/* ほんのり泡のマット（動いてるのが分かる程度・うっすら） */}
      <mesh position={[0, RAFT_HY + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[RAFT_HX * 2 * 0.9, RAFT_HZ * 2 * 0.9]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </RigidBody>
  )
}

function LazyRiver() {
  return (
    <group>
      {/* タイルのふち */}
      <mesh receiveShadow position={[RIVER_CX, 0.02, RIVER_CZ]}>
        <boxGeometry args={[RIVER_W + 2, 0.04, RIVER_D + 1.6]} />
        <meshStandardMaterial color="#e8eef5" />
      </mesh>
      {/* 水底 */}
      <mesh receiveShadow position={[RIVER_CX, 0.04, RIVER_CZ]}>
        <boxGeometry args={[RIVER_W, 0.04, RIVER_D]} />
        <meshStandardMaterial color="#7fd8f5" />
      </mesh>
      {/* 流れる水面（+x 方向へ） */}
      <FlowingWater
        position={[RIVER_CX, WATER_Y, RIVER_CZ]}
        size={[RIVER_W, RIVER_D]}
        flow={[0.16, 0.02]}
        repeat={[8, 1]}
        color="#36b6ef"
        highlight="#d6f3ff"
        opacity={0.8}
        waveHeight={0.1}
      />
      {/* 運ぶラフト（行き／帰りで時間差） */}
      <LazyRaft startX={RAFT_X_MIN} dir0={1} />
      <LazyRaft startX={RAFT_X_MAX} dir0={-1} />
    </group>
  )
}

// ============================================================================
// 着水しぶき＆浮き輪：playerSignal を毎フレーム読み、プール/川に入った瞬間に
// 水しぶき（パーティクル＋音）。水中にいる間は浮き輪をプレイヤーに追従表示。
// 物理は一切いじらない（見た目＋音＋判定だけ）＝安全。
// ============================================================================
function inZone(px: number, pz: number): boolean {
  const inPool = px >= POOL.x0 && px <= POOL.x1 && pz >= POOL.z0 && pz <= POOL.z1
  const inRiver = px >= RIVER.x0 && px <= RIVER.x1 && pz >= RIVER.z0 && pz <= RIVER.z1
  return inPool || inRiver
}

function WaterPlay() {
  const ring = useRef<THREE.Group>(null)
  const wasIn = useRef(false)
  const lastSplash = useRef(-1)

  useFrame((state) => {
    const sig = playerSignal
    const r = ring.current
    if (!sig.valid || !r) return
    const now = state.clock.elapsedTime
    const isIn = inZone(sig.x, sig.z)

    // 入った瞬間＝水しぶき（連発しないようクールダウン）
    if (isIn && !wasIn.current && now - lastSplash.current > 0.5) {
      lastSplash.current = now
      const big = sig.vy < -1.0 || sig.speedH > 3.2 // 滑り台から勢いよく来た＝大きく
      sparkleAt([sig.x, WATER_Y + 0.15, sig.z], '#bfefff')
      if (big) {
        sparkleAt([sig.x, WATER_Y + 0.45, sig.z], '#ffffff')
        sparkleAt([sig.x + 0.4, WATER_Y + 0.25, sig.z - 0.3], '#d6f3ff')
      }
      playSplash(big)
    }
    wasIn.current = isIn

    // 浮き輪：水中だけ表示し、プレイヤーに追従してプカプカ
    r.visible = isIn
    if (isIn) {
      r.position.set(sig.x, WATER_Y + 0.06 + Math.sin(now * 3) * 0.05, sig.z)
      r.rotation.y = now * 0.6
    }
  })

  return (
    <group ref={ring} visible={false}>
      {/* うきわ本体 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.17, 10, 22]} />
        <meshStandardMaterial color="#ff5d8f" roughness={0.5} />
      </mesh>
      {/* うきわの白いしましま */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.17, 0.172, 6, 8, 0.5]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================================
// コイン（坂・滑走面・プールまわり・流れるプール沿い）
// ============================================================================
const COINS_WP: Vec3[] = [
  // 登り坂ぞい（登りながら集める）
  [83, 0.9, CZ],
  [80, 2.0, CZ],
  [77, 3.1, CZ],
  // てっぺん
  [74, 4.4, CZ],
  // 滑走面の上（滑りながら）
  [71, 2.6, CZ],
  [68, 1.0, CZ],
  // プールのまわり
  [59, 1.0, 14],
  [52, 1.0, 19],
  [66, 1.0, 19],
  [59, 1.0, 19.5],
  // 流れるプール沿い
  [44, 1.0, 26],
  [54, 1.0, 26],
  [64, 1.0, 26],
  [74, 1.0, 26],
]

export function AreaWaterPark() {
  return (
    <>
      <SlideTower />
      <Pool />
      <LazyRiver />
      <WaterPlay />
      {COINS_WP.map((p, i) => (
        <Coin key={i} position={p} />
      ))}
      {/* 入口の誘導：登り坂のふもとが光る（「次はここ」） */}
      <PulseGlow position={[85.0, 0.05, CZ]} radius={1.4} />
    </>
  )
}
