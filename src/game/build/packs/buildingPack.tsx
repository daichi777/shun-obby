import { useRef } from 'react'
import type { FC } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'

// たてものパック（おうち / さく / はし / たわー）
// すべて three.js プリミティブのみ・原点中心・底面 y=0・footprint 内に収まる。
// アートディレクション: ぷっくり・まるっこいトイ美学。ベース色＋アクセント＋白/ハイライトの
// 3層をどのアイテムでも持たせ、面取り・段差・縁取りでチャンキーな立体感を出す。
// マテリアルは meshStandardMaterial 中心・metalness 0・roughness 0.7 前後、つや部分だけ低め。

// 共有パレット（同じ世界のトイに見えるよう色味と質感を統一）
const CREAM = '#fff6e9' // 白トリム/縁取り
const GOLD = '#ffd23e' // 金のかざり（つや）
const STONE_LIGHT = '#cdd2dd'
const STONE_MID = '#b3b9c6'
const STONE_DARK = '#8a90a0'
const GLASS_BLUE = '#bfe8ff'
const GLASS_WARM = '#ffdf8a'

// おうち — footprint [2,2] => x,z は ±1 以内。目標ユニット高さ ≈1.0。
// クリーム色の面取り壁＋白い軒トリム＋フレア付き寄棟屋根（縁取り＋段差）＋
// 枠付きドア＋十字桟の窓2つ＋えんとつ。footprint 幅の 90% ほどを使う。
const House: FC = () => (
  <group>
    {/* 土台（プリンス：少し広い段） */}
    <mesh castShadow position={[0, 0.055, 0]}>
      <boxGeometry args={[1.9, 0.11, 1.8]} />
      <meshStandardMaterial color="#e7b969" roughness={0.75} />
    </mesh>
    {/* 本体の壁（バター色） */}
    <mesh castShadow position={[0, 0.32, 0]}>
      <boxGeometry args={[1.8, 0.42, 1.7]} />
      <meshStandardMaterial color="#f7d68a" roughness={0.72} />
    </mesh>
    {/* 軒の白い縁取り（薄い板が屋根の下にはみ出す） */}
    <mesh castShadow position={[0, 0.55, 0]}>
      <boxGeometry args={[1.94, 0.06, 1.84]} />
      <meshStandardMaterial color={CREAM} roughness={0.6} />
    </mesh>
    {/* 屋根：フレア（軒先の段差・濃いコーラルの四角錐台） */}
    <mesh castShadow position={[0, 0.63, 0]} rotation={[0, Math.PI / 4, 0]}>
      <cylinderGeometry args={[1.02, 1.36, 0.16, 4]} />
      <meshStandardMaterial color="#d5453c" roughness={0.7} />
    </mesh>
    {/* 屋根：本体ピラミッド（明るいコーラル） */}
    <mesh castShadow position={[0, 0.88, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[1.02, 0.34, 4]} />
      <meshStandardMaterial color="#ef5b50" roughness={0.68} />
    </mesh>
    {/* てっぺんの金のかざり（つや） */}
    <mesh castShadow position={[0, 1.05, 0]}>
      <sphereGeometry args={[0.07, 12, 10]} />
      <meshStandardMaterial color={GOLD} roughness={0.35} />
    </mesh>
    {/* えんとつ（後ろ左の屋根から生える） */}
    <mesh castShadow position={[-0.46, 0.68, -0.4]}>
      <boxGeometry args={[0.17, 0.44, 0.17]} />
      <meshStandardMaterial color="#d98a5a" roughness={0.72} />
    </mesh>
    <mesh castShadow position={[-0.46, 0.9, -0.4]}>
      <boxGeometry args={[0.22, 0.06, 0.22]} />
      <meshStandardMaterial color="#b96f43" roughness={0.72} />
    </mesh>
    {/* ドア枠（白）＋ドア（水色）＋ノブ（金） */}
    <mesh castShadow position={[0, 0.24, 0.85]}>
      <boxGeometry args={[0.34, 0.46, 0.06]} />
      <meshStandardMaterial color={CREAM} roughness={0.62} />
    </mesh>
    <mesh castShadow position={[0, 0.24, 0.88]}>
      <boxGeometry args={[0.26, 0.4, 0.04]} />
      <meshStandardMaterial color="#46a7d4" roughness={0.5} />
    </mesh>
    <mesh castShadow position={[0.08, 0.26, 0.91]}>
      <sphereGeometry args={[0.032, 10, 8]} />
      <meshStandardMaterial color={GOLD} roughness={0.35} />
    </mesh>
    {/* まど（左右2つ・十字桟つき）。x=±0.55 でドアをよける */}
    {([-0.55, 0.55] as const).map((x) => (
      <group key={x} position={[x, 0.33, 0.85]}>
        {/* 白い枠（背板） */}
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.3, 0.05]} />
          <meshStandardMaterial color={CREAM} roughness={0.6} />
        </mesh>
        {/* ガラス（水色・少しつや） */}
        <mesh castShadow position={[0, 0, 0.03]}>
          <boxGeometry args={[0.22, 0.22, 0.03]} />
          <meshStandardMaterial color={GLASS_BLUE} roughness={0.4} />
        </mesh>
        {/* 十字桟：たて＋よこ */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.03, 0.24, 0.02]} />
          <meshStandardMaterial color={CREAM} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.24, 0.03, 0.02]} />
          <meshStandardMaterial color={CREAM} roughness={0.6} />
        </mesh>
      </group>
    ))}
  </group>
)

// さく — footprint [1,1] => x,z は ±0.5 以内。目標ユニット高さ ≈0.42。
// きれいな杭（先とがり）＋横木2本の1枚柵。幅はセルをほぼ満たす。
const Fence: FC = () => {
  const postX = [-0.32, 0, 0.32] as const
  return (
    <group>
      {postX.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* 杭本体（白・面取りっぽい細い箱） */}
          <mesh castShadow position={[0, 0.19, 0]}>
            <boxGeometry args={[0.13, 0.38, 0.09]} />
            <meshStandardMaterial color="#fbfaf5" roughness={0.7} />
          </mesh>
          {/* とんがり頭（パステルブルーのアクセント） */}
          <mesh castShadow position={[0, 0.43, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.1, 0.11, 4]} />
            <meshStandardMaterial color="#7ec8f2" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* よこ木2本（少しクールな白で2トーン） */}
      {([0.13, 0.31] as const).map((y) => (
        <mesh key={y} castShadow position={[0, y, 0]}>
          <boxGeometry args={[0.86, 0.07, 0.055]} />
          <meshStandardMaterial color="#eaf0f4" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// はし — footprint [2,1] => x は ±1, z は ±0.5 以内。目標ユニット高さ ≈0.5。
// 木の太鼓橋。放物線アーチの床板（板をタンジェントに沿って傾ける）＋
// 両側の丸い手すり（半トーラス）＋支柱。渡れそうな見た目。
const HALF_SPAN = 0.84
const PEAK = 0.3
const DIP = 0.15
const deckTopY = (x: number) => PEAK - DIP * (x / HALF_SPAN) ** 2
const deckSlope = (x: number) => (-2 * DIP * x) / HALF_SPAN ** 2
const RAIL_BASE = 0.16
const RAIL_R = HALF_SPAN
const RAIL_SCALE_Y = 0.42
const railTopY = (x: number) =>
  RAIL_BASE + RAIL_SCALE_Y * Math.sqrt(Math.max(0, RAIL_R * RAIL_R - x * x))

const Bridge: FC = () => {
  const plankX = [-0.84, -0.56, -0.28, 0, 0.28, 0.56, 0.84] as const
  const postX = [-0.62, -0.24, 0.24, 0.62] as const
  const railZ = [-0.36, 0.36] as const
  return (
    <group>
      {/* アーチした床板（板は幅方向=zに長い木のスラット。傾きで滑らかな太鼓に） */}
      {plankX.map((x, i) => (
        <mesh
          key={x}
          castShadow
          position={[x, deckTopY(x) - 0.04, 0]}
          rotation={[0, 0, Math.atan(deckSlope(x))]}
        >
          <boxGeometry args={[0.26, 0.08, 0.78]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#cf9152' : '#e0b478'}
            roughness={0.78}
          />
        </mesh>
      ))}
      {/* 両側の丸い手すり（半トーラス＝滑らかな上レール） */}
      {railZ.map((z) => (
        <mesh key={`rail-${z}`} castShadow position={[0, RAIL_BASE, z]} scale={[1, RAIL_SCALE_Y, 1]}>
          <torusGeometry args={[RAIL_R, 0.038, 6, 20, Math.PI]} />
          <meshStandardMaterial color="#a86b34" roughness={0.72} />
        </mesh>
      ))}
      {/* 支柱（デッキから手すりまで） */}
      {railZ.map((z) =>
        postX.map((x) => {
          const top = railTopY(x)
          const bot = deckTopY(x)
          const h = Math.max(0.06, top - bot)
          return (
            <mesh key={`post-${z}-${x}`} castShadow position={[x, (top + bot) / 2, z]}>
              <boxGeometry args={[0.05, h, 0.05]} />
              <meshStandardMaterial color="#b07439" roughness={0.72} />
            </mesh>
          )
        }),
      )}
    </group>
  )
}

// たわー — footprint [2,2] => x,z は ±1 以内。目標ユニット高さ ≈1.3。
// ずんぐりかわいいお城の塔。石積み（段差＋色差の3段）＋軒リップ＋青い円錐屋根＋
// アーチ窓2つ＋アーチ扉＋旗（既存のゆれアニメ維持）。今よりずっと低くチャンキー。
const Tower: FC = () => {
  const flagRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (flagRef.current) {
      // はたが風にゆれる
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.14
    }
  })
  return (
    <group>
      {/* 石積み：土台（濃）→中段→上段（明）で段差＋色差 */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.62, 0.66, 0.1, 16]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.58, 0.6, 0.32, 16]} />
        <meshStandardMaterial color={STONE_MID} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.57, 0]}>
        <cylinderGeometry args={[0.55, 0.57, 0.3, 16]} />
        <meshStandardMaterial color={STONE_LIGHT} roughness={0.78} />
      </mesh>
      {/* 軒リップ（屋根の下の張り出し） */}
      <mesh castShadow position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.6, 0.62, 0.08, 16]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.8} />
      </mesh>
      {/* 青い円錐屋根 */}
      <mesh castShadow position={[0, 1.03, 0]}>
        <coneGeometry args={[0.66, 0.48, 16]} />
        <meshStandardMaterial color="#4f86dd" roughness={0.62} />
      </mesh>
      {/* てっぺんの金のかざり */}
      <mesh castShadow position={[0, 1.29, 0]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color={GOLD} roughness={0.35} />
      </mesh>
      {/* アーチ窓2つ（前＝低段 / 左側＝高段） */}
      {([
        { pos: [0, 0.42, 0.58] as [number, number, number], rot: 0 },
        { pos: [-0.56, 0.6, 0] as [number, number, number], rot: -Math.PI / 2 },
      ]).map((w, i) => (
        <group key={i} position={w.pos} rotation={[0, w.rot, 0]}>
          {/* 石の枠 */}
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.26, 0.05]} />
            <meshStandardMaterial color={STONE_LIGHT} roughness={0.78} />
          </mesh>
          {/* あたたかい灯り */}
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.13, 0.19, 0.03]} />
            <meshStandardMaterial color={GLASS_WARM} roughness={0.4} />
          </mesh>
          {/* アーチの頭（半球ドーム） */}
          <mesh castShadow position={[0, 0.12, 0.02]}>
            <sphereGeometry args={[0.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={STONE_LIGHT} roughness={0.78} />
          </mesh>
        </group>
      ))}
      {/* アーチ扉（正面・土台） */}
      <mesh castShadow position={[0, 0.16, 0.585]}>
        <boxGeometry args={[0.22, 0.3, 0.05]} />
        <meshStandardMaterial color={STONE_LIGHT} roughness={0.78} />
      </mesh>
      <mesh castShadow position={[0, 0.15, 0.61]}>
        <boxGeometry args={[0.16, 0.26, 0.04]} />
        <meshStandardMaterial color="#7a5230" roughness={0.72} />
      </mesh>
      {/* はたのぼう */}
      <mesh castShadow position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.017, 0.017, 0.3, 6]} />
        <meshStandardMaterial color="#7a5a30" roughness={0.72} />
      </mesh>
      {/* はた（ゆれる） */}
      <mesh ref={flagRef} castShadow position={[0.11, 1.53, 0]}>
        <boxGeometry args={[0.22, 0.13, 0.02]} />
        <meshStandardMaterial color="#ff5da2" roughness={0.6} />
      </mesh>
    </group>
  )
}

export const buildingItems: PackItem[] = [
  {
    id: 'ouchi',
    name: 'おうち',
    emoji: '🏠',
    price: 9,
    footprint: [2, 2] as [number, number],
    Model: House,
    collider: { auto: 'hull' },
  },
  {
    id: 'saku',
    name: 'さく',
    emoji: '🪵',
    price: 1,
    footprint: [1, 1] as [number, number],
    Model: Fence,
    // 横木の高さの薄い壁1枚（ユニット空間 half-extents。PlacementSystem が ×CELL）
    collider: { boxes: [{ args: [0.45, 0.2, 0.055], position: [0, 0.2, 0] }] },
  },
  {
    id: 'hashi',
    name: 'はし',
    emoji: '🌉',
    price: 5,
    footprint: [2, 1] as [number, number],
    Model: Bridge,
    collider: { auto: 'hull' },
  },
  {
    id: 'tawa',
    name: 'たわー',
    emoji: '🏰',
    price: 8,
    footprint: [2, 2] as [number, number],
    Model: Tower,
    collider: { auto: 'hull' },
  },
]
