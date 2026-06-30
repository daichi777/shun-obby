import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'
import { createSlideItem } from './slides/slideKit'

// たのしいアイテムパック（fun）
// すべて three.js プリミティブのみ。底面 y=0・原点中心・footprint 内に収まる。
// drei / テクスチャ / ライト は未使用。アニメは useRef + useFrame のみ。

// ふうせん — 赤いまんまるバルーンが細いひもで小さな台につながれている
// footprint [1,1] => x,z は ±0.5 に収まる。
const Balloon: FC = () => {
  const ref = useRef<THREE.Group>(null)
  // ふわふわ揺れる（揺れ幅は footprint をはみ出さない範囲）
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const t = state.clock.elapsedTime
    g.rotation.z = Math.sin(t * 1.2) * 0.08
    g.position.x = Math.sin(t * 0.9) * 0.03
  })
  return (
    <group>
      {/* 小さな台（アンカー） */}
      <mesh castShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[0.18, 0.08, 0.18]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>
      {/* ひも＋バルーン（根元 y=0.08 を支点にゆれる） */}
      <group ref={ref} position={[0, 0.08, 0]}>
        {/* ひも */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.92, 6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* 結び目 */}
        <mesh castShadow position={[0, 0.94, 0]}>
          <coneGeometry args={[0.05, 0.08, 8]} />
          <meshStandardMaterial color="#e02531" />
        </mesh>
        {/* バルーン本体（つやつや赤いまんまる） */}
        <mesh castShadow position={[0, 1.18, 0]}>
          <sphereGeometry args={[0.26, 18, 18]} />
          <meshStandardMaterial color="#ff2e3e" />
        </mesh>
        {/* ハイライト（つや） */}
        <mesh castShadow position={[-0.08, 1.27, 0.18]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color="#ffd1d6" />
        </mesh>
        {/* ほっぺ（かわいさアップ） */}
        <mesh castShadow position={[-0.13, 1.13, 0.2]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#ff7b8a" />
        </mesh>
        <mesh castShadow position={[0.13, 1.13, 0.2]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#ff7b8a" />
        </mesh>
        {/* おめめ */}
        <mesh castShadow position={[-0.08, 1.2, 0.235]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#3a2a2a" />
        </mesh>
        <mesh castShadow position={[0.08, 1.2, 0.235]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#3a2a2a" />
        </mesh>
      </group>
    </group>
  )
}

// ろけっと — 白いボディに赤いノーズコーン、3枚の赤いフィン、下からオレンジの炎
// footprint [1,1] => x,z は ±0.5 に収まる。
const Rocket: FC = () => {
  const flameRef = useRef<THREE.Mesh>(null)
  // 炎がちらちら脈動
  useFrame((state) => {
    const f = flameRef.current
    if (!f) return
    const s = 1 + Math.sin(state.clock.elapsedTime * 16) * 0.18
    f.scale.set(1, s, 1)
  })
  return (
    <group>
      {/* オレンジの炎 */}
      <mesh ref={flameRef} castShadow position={[0, 0.14, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.12, 0.28, 12]} />
        <meshStandardMaterial color="#ff8a00" />
      </mesh>
      {/* 炎の芯（あかるい黄色） */}
      <mesh castShadow position={[0, 0.2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.16, 10]} />
        <meshStandardMaterial color="#ffe14d" />
      </mesh>
      {/* 白いボディ */}
      <mesh castShadow position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.7, 16]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      {/* まんなかの赤いライン（帯） */}
      <mesh castShadow position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.12, 16]} />
        <meshStandardMaterial color="#ff2e3e" />
      </mesh>
      {/* まる窓（青いガラス） */}
      <mesh castShadow position={[0, 0.78, 0.15]}>
        <sphereGeometry args={[0.06, 14, 14]} />
        <meshStandardMaterial color="#4fc3f7" />
      </mesh>
      {/* 窓のつや（かわいさアップ） */}
      <mesh castShadow position={[-0.022, 0.8, 0.2]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* 赤いノーズコーン */}
      <mesh castShadow position={[0, 1.12, 0]}>
        <coneGeometry args={[0.15, 0.32, 16]} />
        <meshStandardMaterial color="#ff2e3e" />
      </mesh>
      {/* てっぺんのまるポチ */}
      <mesh castShadow position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshStandardMaterial color="#ffe14d" />
      </mesh>
      {/* 3枚の赤いフィン（120度ずつ） */}
      <mesh castShadow position={[0.17, 0.34, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.14, 0.22, 0.03]} />
        <meshStandardMaterial color="#e02531" />
      </mesh>
      <mesh
        castShadow
        position={[-0.085, 0.34, 0.147]}
        rotation={[0, (Math.PI * 2) / 3, -0.5]}
      >
        <boxGeometry args={[0.14, 0.22, 0.03]} />
        <meshStandardMaterial color="#e02531" />
      </mesh>
      <mesh
        castShadow
        position={[-0.085, 0.34, -0.147]}
        rotation={[0, (Math.PI * 4) / 3, -0.5]}
      >
        <boxGeometry args={[0.14, 0.22, 0.03]} />
        <meshStandardMaterial color="#e02531" />
      </mesh>
    </group>
  )
}

// ほし — きらきら光る黄金の五芒星をうすい棒の上にのせて、くるくる回す
// footprint [1,1] => x,z は ±0.5 に収まる。
const Star: FC = () => {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = ref.current
    if (g) g.rotation.y += dt * 1.2
  })
  // 5つの点をコーン（三角）で放射状に。中心はうすい円柱（五角形）。
  const points = [0, 1, 2, 3, 4]
  return (
    <group>
      {/* うすい棒（スティック） */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
        <meshStandardMaterial color="#bfa12e" />
      </mesh>
      {/* くるくる回る星 */}
      <group ref={ref} position={[0, 0.78, 0]}>
        {/* 中心の五角ディスク（うすく押し出した平たい形） */}
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.07, 5]} />
          <meshStandardMaterial color="#ffd11a" />
        </mesh>
        {/* 5つのとがった点 */}
        {points.map((i) => {
          const ang = (i / 5) * Math.PI * 2 + Math.PI / 2
          const r = 0.24
          return (
            <mesh
              key={i}
              castShadow
              position={[Math.cos(ang) * r, Math.sin(ang) * r, 0]}
              rotation={[0, 0, ang - Math.PI / 2]}
            >
              <coneGeometry args={[0.11, 0.26, 4]} />
              <meshStandardMaterial color="#ffdd33" />
            </mesh>
          )
        })}
        {/* まんなかのきらめき（あかるい芯） */}
        <mesh castShadow position={[0, 0, 0.05]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#fff7c2" />
        </mesh>
        {/* おめめ（かわいさアップ） */}
        <mesh castShadow position={[-0.05, 0.01, 0.085]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#3a2a2a" />
        </mesh>
        <mesh castShadow position={[0.05, 0.01, 0.085]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#3a2a2a" />
        </mesh>
      </group>
    </group>
  )
}

export const funItems: PackItem[] = [
  {
    id: 'fusen',
    name: 'ふうせん',
    emoji: '🎈',
    price: 2,
    footprint: [1, 1] as [number, number],
    Model: Balloon,
    collider: 'none', // ふわふわの飾り。すり抜けてOK
  },
  {
    id: 'roketto',
    name: 'ろけっと',
    emoji: '🚀',
    price: 5,
    footprint: [1, 1] as [number, number],
    Model: Rocket,
    collider: { auto: 'hull' }, // 固体（ぶつかる）
  },
  // すべりだい — 6m の台から滑り降りる基本スライダー（共有キットで生成・高く作り直し）
  createSlideItem({
    id: 'suberidai',
    name: 'すべりだい',
    emoji: '🛝',
    price: 4,
    footprint: [3, 1],
    H: 0.6, // 6m
    lanes: 1,
    palette: {
      climb: '#ff8fab',
      platform: '#2979ff',
      slide: '#ffd11a',
      wall: '#ff3b3b',
      accent: '#ffe14d',
    },
  }),
  {
    id: 'hoshi',
    name: 'ほし',
    emoji: '⭐',
    price: 1,
    footprint: [1, 1] as [number, number],
    Model: Star,
    collider: 'none', // くるくる回る飾り
  },
]
