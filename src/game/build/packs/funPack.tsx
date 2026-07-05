import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'
import { createSlideItem } from './slides/slideKit'
import { lighten, darken, GroundShadow } from './kit'

// たのしいアイテムパック（fun）
// すべて three.js プリミティブのみ。底面 y=0・原点中心・footprint 内に収まる。
// drei / テクスチャ / ライト は未使用。アニメは useRef + useFrame（または Sway）のみ。
//
// アートディレクション：ぷっくり・まるっこいトイ美学で統一。
//   ・共通パレット … コーラル赤 #ff5a66 / サニーイエロー #ffd23f / スカイブルー #4fb8ff /
//                    クリーム白 #fff3e0 / 温かいベージュ台座。原色ベタ塗りを避け「ベース+アクセント+つや」の3層。
//   ・面取り … 段付き台座・帯・リング・ハイライトで安っぽさを消す。
//   ・P2 磨き … kit の lighten/darken で「上=光・下/根元=影」の2トーンを全メッシュに、
//               地面に立つ物は <GroundShadow> で接地感、既存アニメ（風船ゆれ/星回転/ロケット炎）は維持。
//   ・マテリアル … meshStandardMaterial 中心 / roughness 0.4〜0.85 / metalness 0。艶部だけ roughness を下げる。
// CELL=4 前提の「低くチャンキー」サイズ（ユニット高さの目安）：ふうせん≈0.72 / ろけっと≈0.79 / ほし≈0.5。

// ふうせん — つやつやコーラルのバルーン＋ひも＋段付きの小さな台。ほっぺ/目は控えめ。
// footprint [1,1] => x,z は ±0.5 に収まる。目標ユニット高さ ≈0.72。
const BALLOON = '#ff5a66'
const BASE_CREAM = '#efdcc4'
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
      {/* 接地シャドウ（台が小さいので薄く） */}
      <GroundShadow size={0.2} opacity={0.12} />

      {/* 台座（2トーン段：暗い根元リング → 明るい上段 → コーラルの段 → むすび目の玉） */}
      <mesh castShadow receiveShadow position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.145, 0.15, 0.03, 16]} />
        <meshStandardMaterial color={darken(BASE_CREAM, 0.16)} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.0425, 0]}>
        <cylinderGeometry args={[0.128, 0.145, 0.025, 16]} />
        <meshStandardMaterial color={lighten(BASE_CREAM, 0.14)} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.085, 0.1, 0.035, 16]} />
        <meshStandardMaterial color="#ff6b73" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.098, 0]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshStandardMaterial color="#fff3e0" roughness={0.5} />
      </mesh>

      {/* ひも＋バルーン（pivot 世界 y=0.06 でゆれる） */}
      <group ref={ref} position={[0, 0.06, 0]}>
        {/* ひも（少し太く・コントラストのある紐色で目立たせる） */}
        <mesh castShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.011, 0.016, 0.34, 6]} />
          <meshStandardMaterial color="#d9c3a0" roughness={0.7} />
        </mesh>
        {/* むすび口（ネック：さかさコーンでバルーンにつながる・下側=darken） */}
        <mesh castShadow position={[0, 0.38, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.06, 0.1, 12]} />
          <meshStandardMaterial color={darken(BALLOON, 0.14)} roughness={0.5} />
        </mesh>
        {/* バルーン本体（ベース）＋2トーン（上 lighten / 下 darken）で球の丸み */}
        <mesh castShadow position={[0, 0.49, 0]} scale={[1, 1.05, 1]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color={BALLOON} roughness={0.4} />
        </mesh>
        {/* 上半分＝光を受ける明トーン */}
        <mesh position={[0, 0.49, 0]} scale={[1, 1.05, 1]}>
          <sphereGeometry args={[0.162, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          <meshStandardMaterial color={lighten(BALLOON, 0.17)} roughness={0.38} />
        </mesh>
        {/* 下半分＝根元の影トーン */}
        <mesh position={[0, 0.49, 0]} scale={[1, 1.05, 1]}>
          <sphereGeometry args={[0.162, 16, 12, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4]} />
          <meshStandardMaterial color={darken(BALLOON, 0.12)} roughness={0.45} />
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
const ROCKET_BODY = '#f7f4ef'
const ROCKET_RED = '#ff5a5f'
const NOSE = '#ff4d55'
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
      {/* 接地シャドウ */}
      <GroundShadow size={0.35} opacity={0.22} />

      {/* オレンジの炎（脈動・下むき・淡い emissive） */}
      <mesh ref={flameRef} castShadow position={[0, 0.12, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.1, 0.2, 12]} />
        <meshStandardMaterial
          color="#ff8a1e"
          roughness={0.5}
          emissive="#ff6a00"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* 炎の芯（あかるい黄・強めの発光で輝き） */}
      <mesh castShadow position={[0, 0.16, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.055, 0.13, 10]} />
        <meshStandardMaterial
          color="#ffe14d"
          roughness={0.4}
          emissive="#ffd000"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* エンジンノズル（下のフレアリング＝根元なので暗トーン） */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.13, 0.06, 16]} />
        <meshStandardMaterial color={darken(ROCKET_RED, 0.12)} roughness={0.55} />
      </mesh>
      {/* 白いボディ（2トーン：下=影トーン / 上=光トーンの2段） */}
      <mesh castShadow position={[0, 0.295, 0]}>
        <cylinderGeometry args={[0.145, 0.147, 0.21, 16]} />
        <meshStandardMaterial color={darken(ROCKET_BODY, 0.07)} roughness={0.58} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.505, 0]}>
        <cylinderGeometry args={[0.14, 0.145, 0.21, 16]} />
        <meshStandardMaterial color={lighten(ROCKET_BODY, 0.13)} roughness={0.52} />
      </mesh>
      {/* まんなかの赤い帯 */}
      <mesh castShadow position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.152, 0.152, 0.08, 16]} />
        <meshStandardMaterial color={ROCKET_RED} roughness={0.5} />
      </mesh>
      {/* かたの段（ノーズ下の黄リング） */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.145, 0.14, 0.04, 16]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.5} />
      </mesh>
      {/* 赤いノーズコーン（ベース） */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <coneGeometry args={[0.14, 0.18, 16]} />
        <meshStandardMaterial color={darken(NOSE, 0.06)} roughness={0.5} />
      </mesh>
      {/* ノーズ先端の明トーン（2トーン：光を受ける先） */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <coneGeometry args={[0.058, 0.075, 16]} />
        <meshStandardMaterial color={lighten(NOSE, 0.18)} roughness={0.42} />
      </mesh>
      {/* てっぺんの玉 */}
      <mesh castShadow position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.4} />
      </mesh>
      {/* まる窓：黄の枠 → 青ガラス（つや） → しろいつや */}
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
      {/* 3枚の赤いフィン（120度ずつ・下フレア／面=影トーン＋上エッジ=光トーンの2トーン） */}
      {finAngles.map((i) => {
        const a = (i * Math.PI * 2) / 3
        const r = 0.15
        return (
          <group key={i} position={[Math.cos(a) * r, 0.24, Math.sin(a) * r]} rotation={[0, -a, -0.42]}>
            <mesh castShadow>
              <boxGeometry args={[0.12, 0.2, 0.028]} />
              <meshStandardMaterial color={darken(ROCKET_RED, 0.12)} roughness={0.55} />
            </mesh>
            {/* 上エッジのハイライト */}
            <mesh position={[0, 0.088, 0]}>
              <boxGeometry args={[0.122, 0.028, 0.03]} />
              <meshStandardMaterial color={lighten(ROCKET_RED, 0.16)} roughness={0.45} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ほし — シャープな五芒星をうすい棒（ワンド）の上でくるくる回す＋きらめき芯＋周囲のキラ。
// footprint [1,1] => x,z は ±0.5 に収まる。目標ユニット高さ ≈0.5。
const WAND = '#e7b93a'
const STAR_YELLOW = '#ffd23f'
const Star: FC = () => {
  const ref = useRef<THREE.Group>(null)
  const sparkRef = useRef<THREE.Group>(null)
  useFrame((state, dt) => {
    const g = ref.current
    if (g) g.rotation.y += dt * 1.2
    // 周囲のキラを薄く点滅（星の回転に同調しつつ大きさで瞬き）
    const s = sparkRef.current
    if (s) {
      const p = 0.72 + Math.sin(state.clock.elapsedTime * 6) * 0.28
      s.scale.setScalar(p)
    }
  })
  const points = [0, 1, 2, 3, 4]
  const sparks = [0, 1, 2, 3]
  return (
    <group>
      {/* 接地シャドウ */}
      <GroundShadow size={0.22} opacity={0.16} />

      {/* うすい棒（ワンド）2トーン：下=影 / 上=光 */}
      <mesh castShadow position={[0, 0.075, 0]}>
        <cylinderGeometry args={[0.021, 0.024, 0.15, 8]} />
        <meshStandardMaterial color={darken(WAND, 0.16)} roughness={0.62} />
      </mesh>
      <mesh castShadow position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.018, 0.021, 0.15, 8]} />
        <meshStandardMaterial color={lighten(WAND, 0.12)} roughness={0.55} />
      </mesh>
      {/* にぎりの玉（2トーン：玉本体=影トーン＋上面ハイライト） */}
      <mesh castShadow position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshStandardMaterial color={darken(STAR_YELLOW, 0.1)} roughness={0.5} />
      </mesh>
      <mesh position={[-0.008, 0.038, 0.014]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color={lighten(STAR_YELLOW, 0.22)} roughness={0.3} />
      </mesh>

      {/* くるくる回る星 */}
      <group ref={ref} position={[0, 0.33, 0]}>
        {/* 中心の五角ディスク（くぼみ＝点より暗い影トーン） */}
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.06, 5]} />
          <meshStandardMaterial color={darken('#ffc21f', 0.1)} roughness={0.5} />
        </mesh>
        {/* 5つのとがった点（先端＝光を受ける明トーンで輝きを強調） */}
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
              <meshStandardMaterial color={lighten('#ffd84d', 0.14)} roughness={0.4} />
            </mesh>
          )
        })}
        {/* まんなかのきらめき芯（黄白・強めの emissive で輝き） */}
        <mesh position={[0, 0, 0.05]}>
          <sphereGeometry args={[0.048, 12, 12]} />
          <meshStandardMaterial
            color="#fffbe6"
            roughness={0.2}
            emissive="#ffe27a"
            emissiveIntensity={0.55}
          />
        </mesh>
        {/* しろい glint */}
        <mesh position={[-0.03, 0.03, 0.078]}>
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
        {/* 周囲のキラ（星と一緒に回りつつ薄く点滅する小球） */}
        <group ref={sparkRef}>
          {sparks.map((i) => {
            const ang = (i / sparks.length) * Math.PI * 2 + Math.PI / 4
            const r = 0.16
            return (
              <mesh key={i} position={[Math.cos(ang) * r, Math.sin(ang) * r, 0.02]}>
                <sphereGeometry args={[0.016, 8, 8]} />
                <meshStandardMaterial
                  color="#fff2b0"
                  roughness={0.25}
                  emissive="#ffdf6b"
                  emissiveIntensity={0.5}
                />
              </mesh>
            )
          })}
        </group>
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
  // すべりだい — 螺旋階段でコンパクトに登る基本スライダー。CELL=4 前提で H=1.1(≈4.4ワールド)・footprint[2,1]。
  // 螺旋なので小さいのに台は高い。palette は fun パックと統一。
  createSlideItem({
    id: 'suberidai',
    name: 'すべりだい',
    emoji: '🛝',
    price: 4,
    footprint: [2, 1],
    H: 1.1,
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
