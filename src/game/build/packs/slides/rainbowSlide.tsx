import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../../itemTypes'

// にじいろスライダー（slides）
// 「歩いて登る ゆるい坂 → 上の台 → 虹色の急な滑走面 → 着地プール」の直線スライダー。
// すべて three.js プリミティブのみ。底面 y=0・原点中心・footprint [2,2] 内に収まる。
//   ・登り坂(あか)      : 約24°（slopeMaxAngle 未満）→ 歩いて登れる。friction 指定なし。
//   ・滑走面(虹色)      : 約35°（slopeMaxAngle 超）＋低摩擦 → 自動で滑り降りる。
//   ・プール(みずいろ)  : 着地して止まる。friction 指定なし。
//
// ★当たり判定の安全策：虹の縞は「見た目の薄い mesh を並べるだけ」。
//   collider は縞の下に通る「1枚の太い滑走面 box」だけにする。
//   （薄い縞を box collider にすると box 数が増えて rapier が panic するため。）
//
// footprint [2,2] => モデル空間 x∈[-1,1], z∈[-1,1], 底面 y=0。設置時に CELL(=10) 倍で実寸へ。
// 見た目モデルは純粋な mesh のみ（RigidBody/collider は持たない）。設置時 PlacementSystem が物理化する。

const CLIMB_ROT = 0.4189 // 登り坂の傾き ≈24°（+で +x 端が高い・slopeMaxAngle 未満）
const SLIDE_ROT = -0.62 // 滑走面の傾き ≈35.5°（-で +x 端が低い・slopeMaxAngle 超）

// 虹の6色（あか・だいだい・きいろ・みどり・あお・むらさき）
const RAINBOW = ['#ff3b30', '#ff8f1f', '#ffd60a', '#34c759', '#0a84ff', '#9b59ff']

// 滑走面の中心・寸法（collider と見た目の親 group をここに合わせる）
const SLIDE_CENTER: [number, number, number] = [0.34, 0.205, 0]
const SLIDE_LEN = 0.66 // 滑走面（傾斜方向）の長さ
const SLIDE_WID = 0.5 // 滑走面（z方向）の幅

const RainbowSlide: FC = () => {
  const water = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const w = water.current
    if (!w) return
    const t = state.clock.elapsedTime
    w.position.y = 0.11 + Math.sin(t * 2.2) * 0.012
    const s = 1 + Math.sin(t * 1.7) * 0.02
    w.scale.set(s, 1, s)
  })

  // 登り坂の段差ライン（見た目だけ。collider はなめらかな坂）
  const steps = [0, 1, 2, 3, 4]
  // 虹の縞（見た目だけ）。滑走面 box の上面に薄い帯を傾斜方向に並べる。
  const stripeLen = SLIDE_LEN / RAINBOW.length

  return (
    <group>
      {/* === 登り坂（あか・歩いて登れる） === */}
      <mesh castShadow receiveShadow position={[-0.58, 0.18, 0]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.95, 0.07, 0.56]} />
        <meshStandardMaterial color="#ff5a5a" />
      </mesh>
      {/* 段差ライン */}
      {steps.map((i) => {
        const p = (i + 0.5) / steps.length
        const x = -1.0 + p * 0.86
        const y = 0.02 + p * 0.38
        return (
          <mesh key={`st${i}`} position={[x, y, 0]} rotation={[0, 0, CLIMB_ROT]}>
            <boxGeometry args={[0.03, 0.09, 0.56]} />
            <meshStandardMaterial color="#e23b3b" />
          </mesh>
        )
      })}
      {/* 登りの横ガード（あお・見た目のみ） */}
      <mesh castShadow position={[-0.58, 0.27, 0.28]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.95, 0.12, 0.04]} />
        <meshStandardMaterial color="#2979ff" />
      </mesh>
      <mesh castShadow position={[-0.58, 0.27, -0.28]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.95, 0.12, 0.04]} />
        <meshStandardMaterial color="#2979ff" />
      </mesh>

      {/* === 上の台（むらさき） === */}
      <mesh castShadow receiveShadow position={[-0.04, 0.33, 0]}>
        <boxGeometry args={[0.44, 0.06, 0.56]} />
        <meshStandardMaterial color="#9b59ff" />
      </mesh>
      {/* うしろのガード＋てっぺんの黄色いポチ */}
      <mesh castShadow position={[-0.24, 0.47, 0]}>
        <boxGeometry args={[0.04, 0.24, 0.56]} />
        <meshStandardMaterial color="#ff3b30" />
      </mesh>
      <mesh castShadow position={[-0.24, 0.61, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#ffd60a" />
      </mesh>
      {/* 台の支柱（グレー・見た目） */}
      <mesh position={[-0.04, 0.16, 0.22]}>
        <boxGeometry args={[0.05, 0.34, 0.05]} />
        <meshStandardMaterial color="#9aa0a8" />
      </mesh>
      <mesh position={[-0.04, 0.16, -0.22]}>
        <boxGeometry args={[0.05, 0.34, 0.05]} />
        <meshStandardMaterial color="#9aa0a8" />
      </mesh>

      {/* === 滑走面（虹色・つるつる） === */}
      {/* 土台：1枚の太い白い滑走面（この下に collider が1本だけ通る。寸法を一致させる） */}
      <mesh
        castShadow
        receiveShadow
        position={SLIDE_CENTER}
        rotation={[0, 0, SLIDE_ROT]}
      >
        <boxGeometry args={[SLIDE_LEN, 0.07, SLIDE_WID]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      {/* 虹の縞（見た目だけ・薄い帯。土台の上面にぴったり並べる。collider なし） */}
      <group position={SLIDE_CENTER} rotation={[0, 0, SLIDE_ROT]}>
        {RAINBOW.map((c, i) => {
          // ローカルx（傾斜方向）に等間隔で並べる
          const lx = -SLIDE_LEN / 2 + stripeLen * (i + 0.5)
          return (
            <mesh key={`rb${i}`} position={[lx, 0.038, 0]}>
              <boxGeometry args={[stripeLen * 0.96, 0.012, SLIDE_WID * 0.92]} />
              <meshStandardMaterial color={c} />
            </mesh>
          )
        })}
      </group>
      {/* 滑走の横かべ（しろ・見た目のみ） */}
      <mesh castShadow position={[SLIDE_CENTER[0], 0.27, 0.24]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[SLIDE_LEN, 0.14, 0.04]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh castShadow position={[SLIDE_CENTER[0], 0.27, -0.24]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[SLIDE_LEN, 0.14, 0.04]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* === 着地プール === */}
      {/* 床 */}
      <mesh receiveShadow position={[0.78, 0.03, 0]}>
        <boxGeometry args={[0.46, 0.06, 0.7]} />
        <meshStandardMaterial color="#cfe9ff" />
      </mesh>
      {/* 壁（+x / +z / -z。-x は滑り込み口なので開ける） */}
      <mesh castShadow position={[1.0, 0.1, 0]}>
        <boxGeometry args={[0.04, 0.2, 0.7]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      <mesh castShadow position={[0.78, 0.1, 0.34]}>
        <boxGeometry args={[0.46, 0.2, 0.04]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      <mesh castShadow position={[0.78, 0.1, -0.34]}>
        <boxGeometry args={[0.46, 0.2, 0.04]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      {/* 水面（みずいろ・ゆらゆら・見た目のみ） */}
      <mesh ref={water} position={[0.78, 0.11, 0]}>
        <boxGeometry args={[0.42, 0.06, 0.64]} />
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

export const rainbowSlideItem: PackItem = {
  id: 'niji-slide',
  name: 'にじいろスライダー',
  emoji: '🌈',
  price: 14,
  footprint: [2, 2] as [number, number],
  Model: RainbowSlide,
  // 物理あたり判定は「厚めで分離した主要面だけ」にしてソルバーを安定させる。
  // 虹の縞は見た目メッシュのみ（衝突なし）。滑走面は太い 1 本の box だけ。
  // すべてユニット空間（CELL倍される）。合計 4 個。
  collider: {
    boxes: [
      // 登り坂（歩いて登れる・通常摩擦：friction 指定なし）
      { args: [0.475, 0.05, 0.28], position: [-0.58, 0.17, 0], rotation: [0, 0, CLIMB_ROT] },
      // 上の台（friction 指定なし）
      { args: [0.22, 0.05, 0.28], position: [-0.04, 0.31, 0] },
      // 滑走面（急斜面・つるつる・縞の下を通る 1 本の太い box。friction のみ 0.03）
      {
        args: [SLIDE_LEN / 2, 0.05, SLIDE_WID / 2],
        position: SLIDE_CENTER,
        rotation: [0, 0, SLIDE_ROT],
        friction: 0.03,
      },
      // 着地プールの床（friction 指定なし）
      { args: [0.23, 0.06, 0.35], position: [0.78, 0.04, 0] },
    ],
  },
}
