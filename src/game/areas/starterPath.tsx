import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody } from '@react-three/rapier'
import { Coin } from '../Coin'
import type { Vec3 } from '../level'

// ============================================================================
// 🌟 スターターパス（最初の30秒の導線・ワードレスオンボーディング）
// スポーン（0,3,2）から「カメラに映る」西へ向かって、
// 「コインの点線 → 低い練習ジャンプパッド3段 → おてほんの すべりだい」と
// 視線と足が自然につながる（固定カメラは -z 向きなので +z 側に置くと見えない）。
//   ・パッドは box + fixed + auto cuboid、friction は書かない（レシピ厳守）
//   ・最初のパッドに脈動する光リング＋光柱ビーコン（文字なしで「ここだよ」）
//   ・動く床レーン（z=±6±2.5）は避ける（z≦3 に収める。コインはプレイヤー判定なのでOK）
// ============================================================================

// 練習パッド: だんだん高くなる3段（ジャンプ高 ~2m に対して 0.35→0.6→0.9 はやさしい）
const PADS: { pos: Vec3; size: Vec3; color: string }[] = [
  { pos: [-7.5, 0.175, 2.8], size: [2.2, 0.35, 2.2], color: '#ff8fab' },
  { pos: [-10.5, 0.3, 2.6], size: [2.2, 0.6, 2.2], color: '#ffd166' },
  { pos: [-13.5, 0.45, 2.2], size: [2.2, 0.9, 2.2], color: '#7ddb6e' },
]

// コインの点線: スポーン（-3,2.5）の少し先 → パッドの上 → おてほんの すべりだいへ。
// ※ スポーン直上に置かない（コインは5秒で復活するので、立っているだけで
//    勝手に拾い続けてしまう）。最寄りでも 2m 以上はなす。
const STARTER_COINS: Vec3[] = [
  [-5.2, 1.0, 2.8],
  [-7.5, 1.1, 2.8], // パッド1の上
  [-10.5, 1.35, 2.6], // パッド2の上
  [-13.5, 1.65, 2.2], // パッド3の上
  [-16.5, 1.0, 1.2], // すべりだいへの続き
  [-19.0, 1.0, 0.5],
]

// 最初のパッドで脈動する「ここだよ」ビーコン（リング＋やわらかい光柱）
function Beacon({ position }: { position: Vec3 }) {
  const ring = useRef<THREE.Mesh>(null)
  const beam = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * 2.4) * 0.16
    if (ring.current) {
      ring.current.scale.set(pulse, pulse, 1)
      const m = ring.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.55 + Math.sin(t * 2.4) * 0.25
    }
    if (beam.current) {
      const m = beam.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.1 + (Math.sin(t * 1.7) + 1) * 0.05
    }
  })

  const [x, y, z] = position
  return (
    <group position={[x, y, z]}>
      {/* 地面すれすれの光リング */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.0, 1.45, 36]} />
        <meshBasicMaterial color="#ffe14d" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {/* やわらかい光柱（とおくからでも見える） */}
      <mesh ref={beam} position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.55, 0.9, 5.2, 12, 1, true]} />
        <meshBasicMaterial
          color="#fff3a6"
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export function AreaStarterPath() {
  return (
    <>
      {/* 練習ジャンプパッド（レシピ: box + fixed + auto cuboid・friction なし） */}
      {PADS.map((p, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid" position={p.pos}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={p.size} />
            <meshStandardMaterial color={p.color} />
          </mesh>
        </RigidBody>
      ))}

      {/* 最初のパッドの根もとにビーコン（ワードレスの「ここだよ」） */}
      <Beacon position={[PADS[0].pos[0], 0.35, PADS[0].pos[2]]} />

      {/* コインの点線 */}
      {STARTER_COINS.map((p, i) => (
        <Coin key={`c${i}`} position={p} />
      ))}
    </>
  )
}
