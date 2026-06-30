import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../../itemTypes'

// きょだいスライダー — 特大の1本スライダー。
//   「歩いて登る階段 → 高い台 → 幅広の急な滑走面 → 着地プール」の直線コース。
//
// 見た目メッシュは純粋な mesh のみ（Model内に RigidBody / collider は置かない）。
// 設置時に PlacementSystem が collider.boxes を CELL(=10) 倍して自動で物理化する。
// すべてユニット空間：x∈[-1,1], z∈[-1,1], 底面 y=0、全体の高さ ≤ 0.45（×10=4.5m）。
//
// あたり判定の角度（rapier の slopeMaxAngle を意識）：
//   ・登り階段(オレンジ): CLIMB_ROT ≈ 0.40rad(約23°) → 歩いて登れる・friction なし
//   ・上の台(赤)        : 水平・friction なし
//   ・滑走面(きいろ)    : SLIDE_ROT ≈ -0.64rad(約37°) → 自動で滑る・friction 0.03
//   ・着地プール床(みずいろ): 水平・friction なし／横の低い壁(friction なし)
//
// box は cuboid のみ・合計 8 個・各 half-extent ≥ 0.04。薄い回転 box は使わない。
const CLIMB_ROT = 0.40 // 登り階段の傾き（+で +x 端が高い）≈23°
const SLIDE_ROT = -0.64 // 滑走面の傾き（-で +x 端が低い）≈37°

const BigSlide: FC = () => {
  const water = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const w = water.current
    if (!w) return
    const t = state.clock.elapsedTime
    w.position.y = 0.05 + Math.sin(t * 2.0) * 0.012
    const s = 1 + Math.sin(t * 1.6) * 0.02
    w.scale.set(s, 1, s)
  })

  // 階段の段（見た目だけ。collider はなめらかな1枚坂）。
  const stairs = [0, 1, 2, 3, 4, 5]

  return (
    <group>
      {/* === 登り階段（オレンジ・歩いて登れる） collider と一致：中心 x=-0.62, y=0.21 === */}
      <mesh castShadow receiveShadow position={[-0.62, 0.21, 0]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.78, 0.08, 0.9]} />
        <meshStandardMaterial color="#ff8a3d" />
      </mesh>
      {/* 段差ライン（見た目だけ） */}
      {stairs.map((i) => {
        const p = (i + 0.5) / stairs.length
        const x = -1.0 + p * 0.76
        const y = 0.04 + p * 0.34
        return (
          <mesh key={`st${i}`} position={[x, y, 0]} rotation={[0, 0, CLIMB_ROT]}>
            <boxGeometry args={[0.04, 0.1, 0.9]} />
            <meshStandardMaterial color="#e76a1f" />
          </mesh>
        )
      })}
      {/* 登りの横ガード（黄・見た目だけ） */}
      <mesh castShadow position={[-0.62, 0.31, 0.45]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.78, 0.14, 0.05]} />
        <meshStandardMaterial color="#ffd11a" />
      </mesh>
      <mesh castShadow position={[-0.62, 0.31, -0.45]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.78, 0.14, 0.05]} />
        <meshStandardMaterial color="#ffd11a" />
      </mesh>

      {/* === 高い台（赤） collider と一致：中心 x=-0.18, y=0.4 上面 ≈0.45 === */}
      <mesh castShadow receiveShadow position={[-0.18, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.9]} />
        <meshStandardMaterial color="#ff3b3b" />
      </mesh>
      {/* 台の支柱（こげ茶・見た目だけ） */}
      <mesh position={[-0.18, 0.18, 0.38]}>
        <boxGeometry args={[0.07, 0.36, 0.07]} />
        <meshStandardMaterial color="#8d5a3b" />
      </mesh>
      <mesh position={[-0.18, 0.18, -0.38]}>
        <boxGeometry args={[0.07, 0.36, 0.07]} />
        <meshStandardMaterial color="#8d5a3b" />
      </mesh>
      {/* うしろのガード＋てっぺんの黄色いポチ（見た目だけ） */}
      <mesh castShadow position={[-0.41, 0.55, 0]}>
        <boxGeometry args={[0.05, 0.3, 0.9]} />
        <meshStandardMaterial color="#ffd11a" />
      </mesh>
      <mesh castShadow position={[-0.41, 0.73, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#ff8a3d" />
      </mesh>

      {/* === 滑走面（きいろ・つるつる急斜面） collider と一致：中心 x=0.28, y=0.26 === */}
      <mesh castShadow receiveShadow position={[0.28, 0.26, 0]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[0.62, 0.08, 0.8]} />
        <meshStandardMaterial color="#ffd11a" />
      </mesh>
      {/* 滑走の横かべ（赤・見た目だけ） */}
      <mesh castShadow position={[0.28, 0.36, 0.4]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[0.62, 0.16, 0.05]} />
        <meshStandardMaterial color="#ff3b3b" />
      </mesh>
      <mesh castShadow position={[0.28, 0.36, -0.4]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[0.62, 0.16, 0.05]} />
        <meshStandardMaterial color="#ff3b3b" />
      </mesh>

      {/* === 着地プール（みずいろ） collider と一致：床 中心 x=0.72, y=0.05 === */}
      {/* 床 */}
      <mesh receiveShadow position={[0.72, 0.05, 0]}>
        <boxGeometry args={[0.52, 0.1, 1.0]} />
        <meshStandardMaterial color="#bfe9ff" />
      </mesh>
      {/* 横かべ（+x / +z / -z。-x は滑り込み口なので開ける） */}
      <mesh castShadow position={[0.98, 0.16, 0]}>
        <boxGeometry args={[0.04, 0.22, 1.0]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      <mesh castShadow position={[0.72, 0.16, 0.48]}>
        <boxGeometry args={[0.52, 0.22, 0.04]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      <mesh castShadow position={[0.72, 0.16, -0.48]}>
        <boxGeometry args={[0.52, 0.22, 0.04]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      {/* 水面（みずいろ・ゆらゆら・見た目だけ） */}
      <mesh ref={water} position={[0.72, 0.05, 0]}>
        <boxGeometry args={[0.48, 0.06, 0.94]} />
        <meshStandardMaterial
          color="#4cc9f0"
          transparent
          opacity={0.82}
          emissive="#1d7fa6"
          emissiveIntensity={0.25}
        />
      </mesh>
    </group>
  )
}

export const bigSlideItem: PackItem = {
  id: 'big-slide',
  name: 'きょだいスライダー',
  emoji: '🛝',
  price: 12,
  footprint: [2, 2] as [number, number],
  Model: BigSlide,
  // 物理あたり判定は「厚めで分離した主要面だけ」。すべてユニット空間（CELL倍される）。
  // friction は滑走面の box だけに 0.03。それ以外は friction フィールドを書かない
  //（undefined を渡すと setFriction(NaN)→rapier panic）。
  collider: {
    boxes: [
      // 登り階段（歩いて登れる・通常摩擦）≈23°
      { args: [0.39, 0.05, 0.45], position: [-0.62, 0.2, 0], rotation: [0, 0, CLIMB_ROT] },
      // 高い台（水平）
      { args: [0.25, 0.05, 0.45], position: [-0.18, 0.39, 0] },
      // 滑走面（急斜面・つるつる）≈37°
      { args: [0.31, 0.05, 0.4], position: [0.28, 0.25, 0], rotation: [0, 0, SLIDE_ROT], friction: 0.03 },
      // 着地プールの床（水平）
      { args: [0.26, 0.05, 0.5], position: [0.72, 0.05, 0] },
      // 着地プールの横かべ（+x 奥・低い壁）
      { args: [0.04, 0.11, 0.5], position: [0.98, 0.15, 0] },
      // 着地プールの横かべ（+z）
      { args: [0.26, 0.11, 0.04], position: [0.72, 0.15, 0.46] },
      // 着地プールの横かべ（-z）
      { args: [0.26, 0.11, 0.04], position: [0.72, 0.15, -0.46] },
    ],
  },
}
