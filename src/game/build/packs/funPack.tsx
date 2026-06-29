import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'

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

// すべりだい — 「歩いて登る ゆるい坂 → 上の台 → 急な滑走面 → 着地プール」の直線スライダー。
// 見た目のメッシュは、PlacementSystem 側で付く collider（itemTypes の boxes 指定）と寸法を一致させてある。
//   ・登り坂(ピンク)  : 約24°（slopeMaxAngle 未満）→ 歩いて登れる
//   ・滑走面(きいろ)  : 約32°（slopeMaxAngle 超）＋低摩擦 → 自動で滑り降りる
//   ・プール(みずいろ): 着地して止まる
// footprint [2,1] => x は ±1、z は ±0.5 に収まる。CELL 倍で実寸へ。
const CLIMB_ROT = 0.4229 // 登り坂の傾き（+で +x 端が高い）
const SLIDE_ROT = -0.5639 // 滑走面の傾き（-で +x 端が低い）
const Slide: FC = () => {
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
  return (
    <group>
      {/* === 登り坂（ピンク・歩いて登れる） === */}
      <mesh castShadow receiveShadow position={[-0.55, 0.18, 0]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.9, 0.07, 0.5]} />
        <meshStandardMaterial color="#ff8fab" />
      </mesh>
      {/* 段差ライン */}
      {steps.map((i) => {
        const p = (i + 0.5) / steps.length
        const x = -0.95 + p * 0.82
        const y = 0.02 + p * 0.37
        return (
          <mesh key={`st${i}`} position={[x, y, 0]} rotation={[0, 0, CLIMB_ROT]}>
            <boxGeometry args={[0.03, 0.09, 0.5]} />
            <meshStandardMaterial color="#f06a92" />
          </mesh>
        )
      })}
      {/* 登りの横ガード（青） */}
      <mesh castShadow position={[-0.55, 0.27, 0.25]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.9, 0.12, 0.04]} />
        <meshStandardMaterial color="#2979ff" />
      </mesh>
      <mesh castShadow position={[-0.55, 0.27, -0.25]} rotation={[0, 0, CLIMB_ROT]}>
        <boxGeometry args={[0.9, 0.12, 0.04]} />
        <meshStandardMaterial color="#2979ff" />
      </mesh>

      {/* === 上の台（青） === */}
      <mesh castShadow receiveShadow position={[-0.02, 0.33, 0]}>
        <boxGeometry args={[0.42, 0.06, 0.52]} />
        <meshStandardMaterial color="#2979ff" />
      </mesh>
      {/* うしろのガード＋てっぺんの黄色いポチ */}
      <mesh castShadow position={[-0.22, 0.47, 0]}>
        <boxGeometry args={[0.04, 0.24, 0.52]} />
        <meshStandardMaterial color="#ff2e3e" />
      </mesh>
      <mesh castShadow position={[-0.22, 0.61, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#ffe14d" />
      </mesh>
      {/* 台の支柱（グレー・見た目） */}
      <mesh position={[-0.02, 0.16, 0.2]}>
        <boxGeometry args={[0.05, 0.34, 0.05]} />
        <meshStandardMaterial color="#9aa0a8" />
      </mesh>
      <mesh position={[-0.02, 0.16, -0.2]}>
        <boxGeometry args={[0.05, 0.34, 0.05]} />
        <meshStandardMaterial color="#9aa0a8" />
      </mesh>

      {/* === 滑走面（きいろ・つるつる） === */}
      <mesh castShadow receiveShadow position={[0.305, 0.205, 0]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[0.6, 0.06, 0.44]} />
        <meshStandardMaterial color="#ffd11a" />
      </mesh>
      {/* 滑走の横かべ（赤） */}
      <mesh castShadow position={[0.305, 0.27, 0.22]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[0.6, 0.14, 0.04]} />
        <meshStandardMaterial color="#ff3b3b" />
      </mesh>
      <mesh castShadow position={[0.305, 0.27, -0.22]} rotation={[0, 0, SLIDE_ROT]}>
        <boxGeometry args={[0.6, 0.14, 0.04]} />
        <meshStandardMaterial color="#ff3b3b" />
      </mesh>

      {/* === 着地プール === */}
      {/* 床 */}
      <mesh receiveShadow position={[0.74, 0.03, 0]}>
        <boxGeometry args={[0.46, 0.06, 0.62]} />
        <meshStandardMaterial color="#cfe9ff" />
      </mesh>
      {/* 壁（+x / +z / -z。-x は滑り込み口なので開ける） */}
      <mesh castShadow position={[0.96, 0.1, 0]}>
        <boxGeometry args={[0.04, 0.2, 0.62]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      <mesh castShadow position={[0.74, 0.1, 0.3]}>
        <boxGeometry args={[0.46, 0.2, 0.04]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      <mesh castShadow position={[0.74, 0.1, -0.3]}>
        <boxGeometry args={[0.46, 0.2, 0.04]} />
        <meshStandardMaterial color="#7fb8e8" />
      </mesh>
      {/* 水面（みずいろ・ゆらゆら） */}
      <mesh ref={water} position={[0.74, 0.11, 0]}>
        <boxGeometry args={[0.42, 0.06, 0.56]} />
        <meshStandardMaterial color="#4cc9f0" transparent opacity={0.82} emissive="#1d7fa6" emissiveIntensity={0.25} />
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
  {
    id: 'suberidai',
    name: 'すべりだい',
    emoji: '🛝',
    price: 4,
    footprint: [2, 1] as [number, number],
    Model: Slide,
    // 物理あたり判定は「厚めで分離した主要面だけ」にしてソルバーを安定させる
    // （薄い回転壁を多数入れると rapier の接触計算が degenerate になり panic することがある）。
    // 横ガード壁は見た目メッシュのみ（衝突なし）。すべてユニット空間（CELL倍される）。
    collider: {
      boxes: [
        // 登り坂（歩いて登れる・通常摩擦）
        { args: [0.45, 0.05, 0.26], position: [-0.55, 0.17, 0], rotation: [0, 0, CLIMB_ROT] },
        // 上の台
        { args: [0.22, 0.05, 0.27], position: [-0.02, 0.31, 0] },
        // 滑走面（急斜面・つるつる）
        { args: [0.31, 0.05, 0.23], position: [0.305, 0.2, 0], rotation: [0, 0, SLIDE_ROT], friction: 0.03 },
        // 着地プールの床
        { args: [0.24, 0.06, 0.32], position: [0.74, 0.04, 0] },
      ],
    },
  },
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
