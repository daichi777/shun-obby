import type { FC } from 'react'
import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PackItem } from '../../itemTypes'

// ツインスライダー — 2本ならんだ滑走レーン（レース風）。
// 共通の登り階段 → 上の台 → 左右2本の滑走面 → 共通の着地プール。
// さわやかな青/水色/白でまとめる。5歳児向け。
//
// 物理の作り方（厳守）:
//   ・見た目は純粋な mesh のみ（RigidBody/collider はモデル内に置かない）。
//   ・footprint [2,2] => x∈[-1,1], z∈[-1,1], 底面 y=0。設置時に PlacementSystem が CELL 倍して物理化。
//   ・friction は「滑走面の box だけ」に 0.03。登り坂/台/プール床/壁には書かない（undefined→NaN で panic するため）。
//   ・登り坂 約24°（CLIMB_ROT=0.42 ≤ 0.42, slopeMaxAngle 未満）→ 歩いて登れる。
//   ・滑走面 約36°（SLIDE_ROT 絶対値0.63 ≥ 0.60, slopeMaxAngle 超）＋低摩擦 → 自動で滑り降りる。
//   ・box は cuboid のみ・合計8個以内・各 half-extent ≥ 0.04・全体高さ ≤ 0.45。
//   ・見た目 mesh と collider box の位置/角度を一致させる。
const CLIMB_ROT = 0.42 // 登り坂の傾き（+で -x 端が低い→ +x へ登る）。約24°。
const SLIDE_ROT = -0.63 // 滑走面の傾き（-で +x 端が低い→ +x へ滑る）。約36°。

// レーンの中心 z 位置（2本を z方向に分離して平行に置く）
const LANE_Z = 0.42

// 1レーン分の滑走面（見た目）。レーン色を引数で受け取る。
const SlideLane: FC<{ z: number; color: string }> = ({ z, color }) => (
  <group>
    {/* 滑走面（つるつる） */}
    <mesh castShadow receiveShadow position={[0.34, 0.2, z]} rotation={[0, 0, SLIDE_ROT]}>
      <boxGeometry args={[0.62, 0.06, 0.34]} />
      <meshStandardMaterial color={color} />
    </mesh>
    {/* 横かべ（白・見た目のみ） */}
    <mesh castShadow position={[0.34, 0.27, z + 0.2]} rotation={[0, 0, SLIDE_ROT]}>
      <boxGeometry args={[0.62, 0.12, 0.04]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
    <mesh castShadow position={[0.34, 0.27, z - 0.2]} rotation={[0, 0, SLIDE_ROT]}>
      <boxGeometry args={[0.62, 0.12, 0.04]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  </group>
)

const TwinSlide: FC = () => {
  const water = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const w = water.current
    if (!w) return
    const t = state.clock.elapsedTime
    w.position.y = 0.1 + Math.sin(t * 2.2) * 0.012
    const s = 1 + Math.sin(t * 1.7) * 0.02
    w.scale.set(s, 1, s)
  })
  // 登り階段の段差ライン（見た目だけ。collider はなめらかな坂）
  const steps = [0, 1, 2, 3, 4]
  return (
    <group>
      {/* === 登り坂（みずいろ・歩いて登れる・全幅で2レーン共通） === */}
      <mesh castShadow receiveShadow position={[-0.55, 0.18, 0]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.9, 0.07, 0.96]} />
        <meshStandardMaterial color="#9fd8ff" />
      </mesh>
      {/* 段差ライン（白） */}
      {steps.map((i) => {
        const p = (i + 0.5) / steps.length
        const x = -0.95 + p * 0.82
        const y = 0.02 + p * 0.37
        return (
          <mesh key={`st${i}`} position={[x, y, 0]} rotation={[0, 0, CLIMB_ROT]}>
            <boxGeometry args={[0.03, 0.085, 0.96]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        )
      })}
      {/* 登りの横ガード（青・見た目のみ） */}
      <mesh castShadow position={[-0.55, 0.27, 0.48]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.9, 0.12, 0.04]} />
        <meshStandardMaterial color="#2979ff" />
      </mesh>
      <mesh castShadow position={[-0.55, 0.27, -0.48]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.9, 0.12, 0.04]} />
        <meshStandardMaterial color="#2979ff" />
      </mesh>

      {/* === 上の台（青・2レーン共通） === */}
      <mesh castShadow receiveShadow position={[-0.02, 0.33, 0]}>
        <boxGeometry args={[0.44, 0.06, 0.98]} />
        <meshStandardMaterial color="#2979ff" />
      </mesh>
      {/* うしろのガード＋てっぺんの白い玉（全体高さ ≤ 0.45 に収める） */}
      <mesh castShadow position={[-0.22, 0.4, 0]}>
        <boxGeometry args={[0.04, 0.11, 0.98]} />
        <meshStandardMaterial color="#1f5fd0" />
      </mesh>
      <mesh castShadow position={[-0.22, 0.41, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* 真ん中のしきり（2レーンを分ける・白・見た目のみ） */}
      <mesh castShadow position={[0.34, 0.26, 0]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[0.62, 0.1, 0.04]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* === 滑走面 2本（z方向に分離して平行） === */}
      <SlideLane z={LANE_Z} color="#4cc9f0" />
      <SlideLane z={-LANE_Z} color="#56c7ff" />

      {/* === 着地プール（2レーン共通） === */}
      {/* 床（みずいろ） */}
      <mesh receiveShadow position={[0.76, 0.03, 0]}>
        <boxGeometry args={[0.46, 0.06, 1.0]} />
        <meshStandardMaterial color="#cfe9ff" />
      </mesh>
      {/* 壁（+x / +z / -z。-x は滑り込み口なので開ける・見た目のみ） */}
      <mesh castShadow position={[0.97, 0.1, 0]}>
        <boxGeometry args={[0.04, 0.18, 1.0]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      <mesh castShadow position={[0.76, 0.1, 0.49]}>
        <boxGeometry args={[0.46, 0.18, 0.04]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      <mesh castShadow position={[0.76, 0.1, -0.49]}>
        <boxGeometry args={[0.46, 0.18, 0.04]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      {/* 水面（みずいろ・ゆらゆら・見た目のみ） */}
      <mesh ref={water} position={[0.76, 0.1, 0]}>
        <boxGeometry args={[0.42, 0.05, 0.92]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.82} emissive="#1d7fa6" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

export const twinSlideItem: PackItem = {
  id: 'twin-slide',
  name: 'ツインスライダー',
  emoji: '🛝',
  price: 10,
  footprint: [2, 2] as [number, number],
  Model: TwinSlide,
  // 物理あたり判定は「厚めで分離した主要面だけ」にしてソルバーを安定させる。
  // 横かべ/しきり/プール壁は見た目メッシュのみ（衝突なし）。すべてユニット空間（CELL倍される）。
  // friction は滑走面 2 box だけに 0.03。他は friction を書かない（undefined→NaN panic 回避）。
  collider: {
    boxes: [
      // 登り坂（歩いて登れる・通常摩擦・全幅で共通） 約24°
      { args: [0.45, 0.05, 0.48], position: [-0.55, 0.17, 0], rotation: [0, 0, CLIMB_ROT] },
      // 上の台（2レーン共通）
      { args: [0.22, 0.05, 0.49], position: [-0.02, 0.31, 0] },
      // 滑走面 レーンA（+z・急斜面・つるつる） 約36°
      { args: [0.31, 0.05, 0.17], position: [0.34, 0.2, LANE_Z], rotation: [0, 0, SLIDE_ROT], friction: 0.03 },
      // 滑走面 レーンB（-z・急斜面・つるつる） 約36°
      { args: [0.31, 0.05, 0.17], position: [0.34, 0.2, -LANE_Z], rotation: [0, 0, SLIDE_ROT], friction: 0.03 },
      // 着地プールの床（2レーン共通）
      { args: [0.23, 0.06, 0.5], position: [0.76, 0.04, 0] },
    ],
  },
}
