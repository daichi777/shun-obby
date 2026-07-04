import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'
import { createSlideItem } from './slides/slideKit'

// たのしいアイテムパック（fun）
// すべて three.js プリミティブのみ。底面 y=0・原点中心・footprint 内に収まる。
// drei / テクスチャ / ライト は未使用。アニメは useRef + useFrame のみ。
//
// アートディレクション：ぷっくり・まるっこいトイ美学で統一。
//   ・共通パレット … コーラル赤 #ff5a66 / サニーイエロー #ffd23f / スカイブルー #4fb8ff /
//                    クリーム白 #fff3e0 / 温かいベージュ台座。原色ベタ塗りを避け「ベース+アクセント+つや」の3層。
//   ・面取り … 段付き台座・帯・リング・ハイライトで安っぽさを消す。
//   ・マテリアル … meshStandardMaterial 中心 / roughness 0.4〜0.85 / metalness 0。艶部だけ roughness を下げる。
// CELL=4 前提の「低くチャンキー」サイズ（ユニット高さの目安）：ふうせん≈0.72 / ろけっと≈0.79 / ほし≈0.5。

// ふうせん — つやつやコーラルのバルーン＋ひも＋段付きの小さな台。ほっぺ/目は控えめ。
// footprint [1,1] => x,z は ±0.5 に収まる。目標ユニット高さ ≈0.72。
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
      {/* 台座（3層：クリーム土台 → コーラルの段 → むすび目の玉） */}
      <mesh castShadow receiveShadow position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.05, 16]} />
        <meshStandardMaterial color="#efdcc4" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.062, 0]}>
        <cylinderGeometry args={[0.085, 0.1, 0.035, 16]} />
        <meshStandardMaterial color="#ff6b73" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.09, 0]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshStandardMaterial color="#fff3e0" roughness={0.5} />
      </mesh>

      {/* ひも＋バルーン（pivot 世界 y=0.06 でゆれる） */}
      <group ref={ref} position={[0, 0.06, 0]}>
        {/* ひも（すこしテーパー） */}
        <mesh castShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.008, 0.013, 0.34, 6]} />
          <meshStandardMaterial color="#fff3e0" roughness={0.7} />
        </mesh>
        {/* むすび口（ネック：さかさコーンでバルーンにつながる） */}
        <mesh castShadow position={[0, 0.38, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.06, 0.1, 12]} />
          <meshStandardMaterial color="#ff4d5a" roughness={0.45} />
        </mesh>
        {/* バルーン本体（つやつや・すこし縦長のティアドロップ） */}
        <mesh castShadow position={[0, 0.49, 0]} scale={[1, 1.05, 1]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#ff5a66" roughness={0.4} />
        </mesh>
        {/* おおきなハイライト（つや） */}
        <mesh position={[-0.055, 0.55, 0.11]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshStandardMaterial color="#ffd9dd" roughness={0.3} />
        </mesh>
        {/* しろい鏡面ドット */}
        <mesh position={[-0.075, 0.575, 0.125]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* ほっぺ（控えめ） */}
        <mesh position={[-0.1, 0.45, 0.115]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ff96a0" roughness={0.6} />
        </mesh>
        <mesh position={[0.1, 0.45, 0.115]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ff96a0" roughness={0.6} />
        </mesh>
        {/* おめめ（控えめ） */}
        <mesh position={[-0.055, 0.475, 0.15]}>
          <sphereGeometry args={[0.026, 8, 8]} />
          <meshStandardMaterial color="#3a2f2f" roughness={0.5} />
        </mesh>
        <mesh position={[0.055, 0.475, 0.15]}>
          <sphereGeometry args={[0.026, 8, 8]} />
          <meshStandardMaterial color="#3a2f2f" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

// ろけっと — 白ボディ＋赤ノーズコーン＋フィン3枚＋丸窓(青ガラス＋つや)＋帯＋炎(脈動)。
// footprint [1,1] => x,z は ±0.5 に収まる。目標ユニット高さ ≈0.79。
const Rocket: FC = () => {
  const flameRef = useRef<THREE.Mesh>(null)
  // 炎がちらちら脈動
  useFrame((state) => {
    const f = flameRef.current
    if (!f) return
    const s = 1 + Math.sin(state.clock.elapsedTime * 16) * 0.18
    f.scale.set(1, s, 1)
  })
  const finAngles = [0, 1, 2]
  return (
    <group>
      {/* オレンジの炎（脈動・下むき） */}
      <mesh ref={flameRef} castShadow position={[0, 0.12, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.1, 0.2, 12]} />
        <meshStandardMaterial
          color="#ff8a1e"
          roughness={0.5}
          emissive="#ff6a00"
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* 炎の芯（あかるい黄） */}
      <mesh castShadow position={[0, 0.16, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.055, 0.13, 10]} />
        <meshStandardMaterial
          color="#ffe14d"
          roughness={0.4}
          emissive="#ffd000"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* エンジンノズル（下のフレアリング） */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.13, 0.06, 16]} />
        <meshStandardMaterial color="#ff5a5f" roughness={0.55} />
      </mesh>
      {/* 白いボディ */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.14, 0.145, 0.42, 16]} />
        <meshStandardMaterial color="#f7f4ef" roughness={0.55} />
      </mesh>
      {/* まんなかの赤い帯 */}
      <mesh castShadow position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.152, 0.152, 0.08, 16]} />
        <meshStandardMaterial color="#ff5a5f" roughness={0.5} />
      </mesh>
      {/* かたの段（ノーズ下の黄リング） */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.145, 0.14, 0.04, 16]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.5} />
      </mesh>
      {/* 赤いノーズコーン */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <coneGeometry args={[0.14, 0.18, 16]} />
        <meshStandardMaterial color="#ff4d55" roughness={0.5} />
      </mesh>
      {/* てっぺんの玉 */}
      <mesh castShadow position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.4} />
      </mesh>
      {/* まる窓：黄の枠 → 青ガラス → しろいつや */}
      <mesh castShadow position={[0, 0.47, 0.13]}>
        <torusGeometry args={[0.055, 0.02, 8, 16]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.47, 0.13]}>
        <sphereGeometry args={[0.05, 14, 14]} />
        <meshStandardMaterial
          color="#4fb8ff"
          roughness={0.25}
          emissive="#1f6dab"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[-0.018, 0.49, 0.17]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </mesh>
      {/* 3枚の赤いフィン（120度ずつ・下に向かってフレア） */}
      {finAngles.map((i) => {
        const a = (i * Math.PI * 2) / 3
        const r = 0.15
        return (
          <mesh
            key={i}
            castShadow
            position={[Math.cos(a) * r, 0.24, Math.sin(a) * r]}
            rotation={[0, -a, -0.42]}
          >
            <boxGeometry args={[0.12, 0.2, 0.028]} />
            <meshStandardMaterial color="#e8464e" roughness={0.55} />
          </mesh>
        )
      })}
    </group>
  )
}

// ほし — シャープな五芒星をうすい棒（ワンド）の上でくるくる回す＋きらめき芯。
// footprint [1,1] => x,z は ±0.5 に収まる。目標ユニット高さ ≈0.5。
const Star: FC = () => {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = ref.current
    if (g) g.rotation.y += dt * 1.2
  })
  const points = [0, 1, 2, 3, 4]
  return (
    <group>
      {/* うすい棒（ワンド） */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.018, 0.024, 0.3, 8]} />
        <meshStandardMaterial color="#e7b93a" roughness={0.6} />
      </mesh>
      {/* にぎりの玉 */}
      <mesh castShadow position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.5} />
      </mesh>
      {/* くるくる回る星 */}
      <group ref={ref} position={[0, 0.33, 0]}>
        {/* 中心の五角ディスク（うすく押し出した平たい形） */}
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.06, 5]} />
          <meshStandardMaterial color="#ffc21f" roughness={0.5} />
        </mesh>
        {/* 5つのとがった点（4面ピラミッドでシャープに） */}
        {points.map((i) => {
          const ang = (i / 5) * Math.PI * 2 + Math.PI / 2
          const r = 0.11
          return (
            <mesh
              key={i}
              castShadow
              position={[Math.cos(ang) * r, Math.sin(ang) * r, 0]}
              rotation={[0, 0, ang - Math.PI / 2]}
            >
              <coneGeometry args={[0.06, 0.13, 4]} />
              <meshStandardMaterial color="#ffd84d" roughness={0.45} />
            </mesh>
          )
        })}
        {/* まんなかのきらめき芯（艶・自己発光ぎみ） */}
        <mesh position={[0, 0, 0.05]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial
            color="#fff6c8"
            roughness={0.25}
            emissive="#ffe27a"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* しろい glint */}
        <mesh position={[-0.03, 0.03, 0.075]}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* おめめ（控えめ） */}
        <mesh position={[-0.04, -0.01, 0.07]}>
          <sphereGeometry args={[0.017, 8, 8]} />
          <meshStandardMaterial color="#3a2f2f" roughness={0.5} />
        </mesh>
        <mesh position={[0.04, -0.01, 0.07]}>
          <sphereGeometry args={[0.017, 8, 8]} />
          <meshStandardMaterial color="#3a2f2f" roughness={0.5} />
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
  // すべりだい — CELL=4 前提で「登って乗れる」コンパクトな基本スライダー。H=0.5(≈2.0ワールド)・footprint[3,1]（小さめ最適化）。
  // （登り坂24°を歩ける長さ＋着地プールが footprint 内に収まる最小長）。palette は fun パックと統一。
  createSlideItem({
    id: 'suberidai',
    name: 'すべりだい',
    emoji: '🛝',
    price: 4,
    footprint: [3, 1],
    H: 0.5,
    lanes: 1,
    palette: {
      climb: '#ff8fa3',
      platform: '#3aa0ff',
      slide: '#ffd23f',
      wall: '#ff5a5f',
      accent: '#ffe487',
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
