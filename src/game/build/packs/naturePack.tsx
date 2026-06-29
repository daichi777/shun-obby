import { useRef } from 'react'
import type { FC } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'

// nature パック（き / おはな / きのこ / にじ）
// すべて three.js プリミティブのみ・原点中心・底面 y=0・footprint 内に収まるよう設計。

// き: 茶色い幹に、もこもこ丸い緑のかさねた葉っぱ。ちいさな赤いりんごつき。
// footprint [1,1] → x,z ともに ±0.5 以内（葉の最外 x=0.36 < 0.5）。
const Tree: FC = () => (
  <group>
    {/* 幹（底面 y=0 から立ち上がる） */}
    <mesh castShadow position={[0, 0.22, 0]}>
      <cylinderGeometry args={[0.1, 0.13, 0.44, 10]} />
      <meshStandardMaterial color="#9c5a2c" />
    </mesh>
    {/* 下のもこもこ（大きめ） */}
    <mesh castShadow position={[0, 0.62, 0]}>
      <sphereGeometry args={[0.36, 16, 16]} />
      <meshStandardMaterial color="#43c14a" />
    </mesh>
    {/* よこのもこもこ（ふっくら見せる小玉・左右） */}
    <mesh castShadow position={[0.24, 0.56, 0.02]}>
      <sphereGeometry args={[0.18, 14, 14]} />
      <meshStandardMaterial color="#4ccb52" />
    </mesh>
    <mesh castShadow position={[-0.24, 0.58, -0.02]}>
      <sphereGeometry args={[0.17, 14, 14]} />
      <meshStandardMaterial color="#4ccb52" />
    </mesh>
    {/* 上のもこもこ（小さめ） */}
    <mesh castShadow position={[0, 0.96, 0]}>
      <sphereGeometry args={[0.26, 16, 16]} />
      <meshStandardMaterial color="#5ad860" />
    </mesh>
    {/* りんご（緑から少し顔をだす赤い実） */}
    <mesh castShadow position={[0.3, 0.6, 0.16]}>
      <sphereGeometry args={[0.07, 10, 10]} />
      <meshStandardMaterial color="#ff3b3b" />
    </mesh>
    <mesh castShadow position={[-0.26, 0.72, 0.2]}>
      <sphereGeometry args={[0.06, 10, 10]} />
      <meshStandardMaterial color="#ff3b3b" />
    </mesh>
    <mesh castShadow position={[0.06, 1.06, 0.14]}>
      <sphereGeometry args={[0.06, 10, 10]} />
      <meshStandardMaterial color="#ff3b3b" />
    </mesh>
  </group>
)

// おはな: 細い緑の茎、左右に葉っぱ、平たいピンクの花、まんなかに黄色。
// footprint [1,1] → x,z ともに ±0.5 以内（花びら最外 x≈0.17 < 0.5）。
const Flower: FC = () => (
  <group>
    {/* 茎（底面 y=0 から） */}
    <mesh castShadow position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.025, 0.03, 0.4, 8]} />
      <meshStandardMaterial color="#3fae57" />
    </mesh>
    {/* 葉っぱ（左） */}
    <mesh castShadow position={[-0.11, 0.22, 0]} rotation={[0, 0, 0.9]} scale={[1, 0.4, 0.5]}>
      <sphereGeometry args={[0.1, 10, 10]} />
      <meshStandardMaterial color="#52c46a" />
    </mesh>
    {/* 葉っぱ（右） */}
    <mesh castShadow position={[0.11, 0.16, 0]} rotation={[0, 0, -0.9]} scale={[1, 0.4, 0.5]}>
      <sphereGeometry args={[0.09, 10, 10]} />
      <meshStandardMaterial color="#52c46a" />
    </mesh>
    {/* 花びら（まわりに5枚・ぷっくり） */}
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2
      return (
        <mesh
          key={i}
          castShadow
          position={[Math.cos(a) * 0.13, 0.46, Math.sin(a) * 0.13]}
          scale={[1, 0.7, 1]}
        >
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshStandardMaterial color="#ff5fb0" />
        </mesh>
      )
    })}
    {/* まんなかの黄色 */}
    <mesh castShadow position={[0, 0.49, 0]}>
      <sphereGeometry args={[0.08, 12, 12]} />
      <meshStandardMaterial color="#ffd83a" />
    </mesh>
  </group>
)

// きのこ: 太い白い柄、赤いドーム（半球）のかさ、白い水玉、ほっぺ付き。
// footprint [1,1] → x,z ともに ±0.5 以内（かさ半径 0.3 < 0.5）。
const Mushroom: FC = () => (
  <group>
    {/* 柄（太い白・底面 y=0 から） */}
    <mesh castShadow position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.13, 0.15, 0.4, 12]} />
      <meshStandardMaterial color="#fff6ea" />
    </mesh>
    {/* かさ（赤い半球） */}
    <mesh castShadow position={[0, 0.4, 0]}>
      <sphereGeometry args={[0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#ec3b34" />
    </mesh>
    {/* 水玉（白い点々） */}
    <mesh castShadow position={[0, 0.69, 0]}>
      <sphereGeometry args={[0.055, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" />
    </mesh>
    <mesh castShadow position={[0.17, 0.52, 0.1]}>
      <sphereGeometry args={[0.05, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" />
    </mesh>
    <mesh castShadow position={[-0.15, 0.54, 0.12]}>
      <sphereGeometry args={[0.045, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" />
    </mesh>
    <mesh castShadow position={[0.05, 0.5, -0.2]}>
      <sphereGeometry args={[0.05, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" />
    </mesh>
    <mesh castShadow position={[-0.13, 0.49, -0.16]}>
      <sphereGeometry args={[0.04, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" />
    </mesh>
    {/* ほっぺ（柄にちょこんと・かわいさアップ） */}
    <mesh castShadow position={[0.1, 0.24, 0.13]}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshStandardMaterial color="#ff9ec2" />
    </mesh>
    <mesh castShadow position={[-0.1, 0.24, 0.13]}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshStandardMaterial color="#ff9ec2" />
    </mesh>
  </group>
)

// にじ: 赤・橙・黄・緑・青のアーチをかさね、両端にふわふわの白い雲。
// footprint [2,2] → x,z ともに ±1 以内。アーチは XY 平面（torus）。
// 底面 y=0：雲が地面に接地し、その上にアーチが乗る。useFrame でゆっくり上下にふわり
// （静止位置で接地、揺れても地面より下に潜らない範囲）。
const Rainbow: FC = () => {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) {
      // 0〜+0.04 の範囲でふわり浮く（静止時は y=0 接地・常に地面以上）。
      ref.current.position.y = (Math.sin(state.clock.elapsedTime * 1.2) + 1) * 0.02
    }
  })
  // 外側から内側へ。半径を縮めつつ色を変える。
  const bands: { r: number; color: string }[] = [
    { r: 0.86, color: '#ff4d4d' }, // 赤
    { r: 0.74, color: '#ff9a3c' }, // 橙
    { r: 0.62, color: '#ffe14d' }, // 黄
    { r: 0.5, color: '#4cd964' }, // 緑
    { r: 0.38, color: '#3aa0ff' }, // 青
  ]
  const tube = 0.06
  return (
    <group ref={ref}>
      {/* アーチ本体（上半分の半リング）。雲の上に乗るよう少し持ち上げる。 */}
      <group position={[0, 0.3, 0]}>
        {bands.map((b) => (
          <mesh key={b.color} castShadow>
            <torusGeometry args={[b.r, tube, 12, 28, Math.PI]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
        ))}
      </group>
      {/* 左の雲（複数の球でふわふわ・地面に接地） */}
      <group position={[-0.68, 0, 0]}>
        <mesh castShadow position={[0, 0.17, 0]}>
          <sphereGeometry args={[0.17, 14, 14]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh castShadow position={[0.15, 0.12, 0.05]}>
          <sphereGeometry args={[0.12, 14, 14]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh castShadow position={[-0.14, 0.12, -0.04]}>
          <sphereGeometry args={[0.12, 14, 14]} />
          <meshStandardMaterial color="#f2f7ff" />
        </mesh>
      </group>
      {/* 右の雲 */}
      <group position={[0.68, 0, 0]}>
        <mesh castShadow position={[0, 0.17, 0]}>
          <sphereGeometry args={[0.17, 14, 14]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh castShadow position={[-0.15, 0.12, 0.05]}>
          <sphereGeometry args={[0.12, 14, 14]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh castShadow position={[0.14, 0.12, -0.04]}>
          <sphereGeometry args={[0.12, 14, 14]} />
          <meshStandardMaterial color="#f2f7ff" />
        </mesh>
      </group>
    </group>
  )
}

export const natureItems: PackItem[] = [
  { id: 'ki', name: 'き', emoji: '🌳', price: 4, footprint: [1, 1], Model: Tree },
  { id: 'ohana', name: 'おはな', emoji: '🌷', price: 1, footprint: [1, 1], Model: Flower },
  { id: 'kinoko', name: 'きのこ', emoji: '🍄', price: 2, footprint: [1, 1], Model: Mushroom },
  { id: 'niji', name: 'にじ', emoji: '🌈', price: 7, footprint: [2, 2], Model: Rainbow },
]
