import { useRef } from 'react'
import type { FC } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'
import { GroundShadow, lighten, darken } from './kit'

// たてものパック（おうち / さく / はし / たわー）
// すべて three.js プリミティブのみ・原点中心・底面 y=0・footprint 内に収まる。
// アートディレクション: ぷっくり・まるっこいトイ美学。共有キット(kit.tsx)の lighten/darken で
// 各面を最低2段の陰影に（上面/角=lighten・根元/裏/くぼみ=darken）、GroundShadow で接地感を統一する。
// 建物は基本静止（既存の旗ゆれ等のアニメだけ維持）。マテリアルは meshStandardMaterial 中心・
// metalness 0・roughness 0.7前後、つや部分だけ低め。emissive はメッシュ側の質感表現のみで使用。

// 共有パレット（同じ世界のトイに見えるよう色味と質感を統一）。2トーンは lighten/darken で派生。
const CREAM = '#fff6e9' // 白トリム/縁取り
const GOLD = '#ffd23e' // 金のかざり（つや）
const STONE = '#b3b9c6' // 石のベース（tower。lighten/darken で段差の色差を作る）
const GLASS_BLUE = '#bfe8ff' // 窓ガラス（おうち）
const GLASS_WARM = '#ffdf8a' // 窓の灯り（たわー）
const WALL = '#f4cf82' // おうちの壁ベース
const ROOF = '#ef5b50' // おうちの屋根ベース（瓦の段を lighten/darken で）
const WOOD = '#c98f52' // はしの木ベース（板/レール/支柱を2トーンで）
const PICKET = '#fbfaf5' // さくの杭ベース
const RAILW = '#eaf0f4' // さくの横木ベース

// おうち — footprint [2,2] => x,z は ±1 以内。目標ユニット高さ ≈1.05。
// バター色の面取り壁（土台=darken／軒=cream で縦2トーン）＋段差付きの寄棟屋根（瓦の色差を
// darken→base→lighten で3段）＋枠付きドア＋十字桟の窓2つ＋えんとつ＋ドア前の踏み石(小道)。
const House: FC = () => (
  <group>
    <GroundShadow size={0.95} opacity={0.22} />
    {/* 土台（壁より濃い段＝根元の影） */}
    <mesh castShadow position={[0, 0.055, 0]}>
      <boxGeometry args={[1.9, 0.11, 1.8]} />
      <meshStandardMaterial color={darken(WALL, 0.22)} roughness={0.75} />
    </mesh>
    {/* 本体の壁（バター色。土台=darken と軒=cream=lighten に挟まれ縦2トーン） */}
    <mesh castShadow position={[0, 0.32, 0]}>
      <boxGeometry args={[1.8, 0.42, 1.7]} />
      <meshStandardMaterial color={WALL} roughness={0.72} />
    </mesh>
    {/* 軒の白い縁取り（薄い板が屋根の下にはみ出す） */}
    <mesh castShadow position={[0, 0.55, 0]}>
      <boxGeometry args={[1.94, 0.06, 1.84]} />
      <meshStandardMaterial color={CREAM} roughness={0.6} />
    </mesh>
    {/* 屋根：軒先スカート（濃いコーラル＝瓦の一番下の段） */}
    <mesh castShadow position={[0, 0.63, 0]} rotation={[0, Math.PI / 4, 0]}>
      <cylinderGeometry args={[1.02, 1.36, 0.16, 4]} />
      <meshStandardMaterial color={darken(ROOF, 0.16)} roughness={0.7} />
    </mesh>
    {/* 屋根：下段の瓦（基準コーラル） */}
    <mesh castShadow position={[0, 0.75, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[1.0, 0.24, 4]} />
      <meshStandardMaterial color={ROOF} roughness={0.68} />
    </mesh>
    {/* 屋根：上段の瓦（明るいコーラル・少し細く段差＝瓦のステップ） */}
    <mesh castShadow position={[0, 0.92, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.66, 0.26, 4]} />
      <meshStandardMaterial color={lighten(ROOF, 0.14)} roughness={0.66} />
    </mesh>
    {/* てっぺんの金のかざり（つや） */}
    <mesh castShadow position={[0, 1.05, 0]}>
      <sphereGeometry args={[0.07, 12, 10]} />
      <meshStandardMaterial color={GOLD} roughness={0.35} emissive={GOLD} emissiveIntensity={0.15} />
    </mesh>
    {/* えんとつ（後ろ左の屋根から生える。胴=lighten／笠=darken の2トーン） */}
    <mesh castShadow position={[-0.46, 0.68, -0.4]}>
      <boxGeometry args={[0.17, 0.44, 0.17]} />
      <meshStandardMaterial color={lighten('#c8794a', 0.06)} roughness={0.72} />
    </mesh>
    <mesh castShadow position={[-0.46, 0.9, -0.4]}>
      <boxGeometry args={[0.22, 0.06, 0.22]} />
      <meshStandardMaterial color={darken('#c8794a', 0.18)} roughness={0.72} />
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
    {/* ドア前の踏み石（小道）：2段のステップ。上段=lighten／下段=darken の石2トーン */}
    <mesh castShadow position={[0, 0.12, 0.9]}>
      <boxGeometry args={[0.44, 0.06, 0.1]} />
      <meshStandardMaterial color={lighten(STONE, 0.12)} roughness={0.8} />
    </mesh>
    <mesh castShadow position={[0, 0.075, 0.95]}>
      <boxGeometry args={[0.54, 0.06, 0.08]} />
      <meshStandardMaterial color={darken(STONE, 0.06)} roughness={0.82} />
    </mesh>
    {/* まど（左右2つ・十字桟つき＝桟の陰影）。x=±0.55 でドアをよける */}
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

// さく — footprint [1,1] => x,z は ±0.5 以内。目標ユニット高さ ≈0.48。
// きれいな杭（先とがり）＋横木2本の1枚柵。足元に darken の座金、杭本体は lighten で厚み。
// 横木は 上=lighten / 下=darken の2トーン。collider は明示 boxes のままなので飾りは干渉しない。
const Fence: FC = () => {
  const postX = [-0.32, 0, 0.32] as const
  return (
    <group>
      <GroundShadow size={0.45} opacity={0.2} />
      {postX.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* 足元の座金（darken=下・少し広く＝地面に刺さった厚み） */}
          <mesh castShadow position={[0, 0.05, 0]}>
            <boxGeometry args={[0.16, 0.1, 0.12]} />
            <meshStandardMaterial color={darken(PICKET, 0.14)} roughness={0.78} />
          </mesh>
          {/* 杭本体（明るい白＝上） */}
          <mesh castShadow position={[0, 0.2, 0]}>
            <boxGeometry args={[0.13, 0.38, 0.09]} />
            <meshStandardMaterial color={lighten(PICKET, 0.02)} roughness={0.7} />
          </mesh>
          {/* とんがり頭（パステルブルーのアクセント） */}
          <mesh castShadow position={[0, 0.43, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.1, 0.11, 4]} />
            <meshStandardMaterial color="#7ec8f2" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* よこ木2本：上=lighten / 下=darken で厚みを出す */}
      <mesh castShadow position={[0, 0.31, 0]}>
        <boxGeometry args={[0.86, 0.07, 0.055]} />
        <meshStandardMaterial color={lighten(RAILW, 0.2)} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.13, 0]}>
        <boxGeometry args={[0.86, 0.07, 0.055]} />
        <meshStandardMaterial color={darken(RAILW, 0.14)} roughness={0.72} />
      </mesh>
    </group>
  )
}

// はし — footprint [2,1] => x は ±1, z は ±0.5 以内。目標ユニット高さ ≈0.5。
// 木の太鼓橋。放物線アーチの床板（交互 darken/lighten で継ぎ目の陰影）＋両側の丸い手すり
// （半トーラス・濃い木）＋支柱（中間トーン）＋手すり端のロープ結び目風の丸玉。
// GroundShadow は円のため footprint(z=±0.5)を超えないよう size=0.5（hull を footprint 内に保つ）。
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
  const railEndX = [-RAIL_R, RAIL_R] as const
  return (
    <group>
      <GroundShadow size={0.5} opacity={0.18} />
      {/* アーチした床板（板は幅方向=zに長い木のスラット。交互2トーンで板の継ぎ目に陰影） */}
      {plankX.map((x, i) => (
        <mesh
          key={x}
          castShadow
          position={[x, deckTopY(x) - 0.04, 0]}
          rotation={[0, 0, Math.atan(deckSlope(x))]}
        >
          <boxGeometry args={[0.26, 0.08, 0.78]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? darken(WOOD, 0.14) : lighten(WOOD, 0.12)}
            roughness={0.78}
          />
        </mesh>
      ))}
      {/* 両側の丸い手すり（半トーラス＝滑らかな上レール・濃い木） */}
      {railZ.map((z) => (
        <mesh key={`rail-${z}`} castShadow position={[0, RAIL_BASE, z]} scale={[1, RAIL_SCALE_Y, 1]}>
          <torusGeometry args={[RAIL_R, 0.038, 6, 20, Math.PI]} />
          <meshStandardMaterial color={darken(WOOD, 0.2)} roughness={0.72} />
        </mesh>
      ))}
      {/* 支柱（デッキから手すりまで・中間トーン） */}
      {railZ.map((z) =>
        postX.map((x) => {
          const top = railTopY(x)
          const bot = deckTopY(x)
          const h = Math.max(0.06, top - bot)
          return (
            <mesh key={`post-${z}-${x}`} castShadow position={[x, (top + bot) / 2, z]}>
              <boxGeometry args={[0.05, h, 0.05]} />
              <meshStandardMaterial color={lighten(WOOD, 0.02)} roughness={0.72} />
            </mesh>
          )
        }),
      )}
      {/* 手すり端のロープ結び目風の丸玉（親柱ぽく端を締める） */}
      {railZ.map((z) =>
        railEndX.map((x) => (
          <mesh key={`knob-${z}-${x}`} castShadow position={[x, RAIL_BASE + 0.02, z]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial color={darken(WOOD, 0.26)} roughness={0.68} />
          </mesh>
        )),
      )}
    </group>
  )
}

// たわー — footprint [2,2] => x,z は ±1 以内。目標ユニット高さ ≈1.29（金のかざり）。
// ずんぐりかわいいお城の塔（作り直し）。石ブロックの段を3段（色差＝darken→base→lighten・
// わずかな半径差で積む）＋上端に城壁のギザギザ(crenellations)をぐるり＋その内側から青い円錐屋根＋
// 石枠で深いアーチ窓2つ＋アーチ扉＋根元に苔のアクセント。旗の既存ゆれは維持・建物なので静止。
const Tower: FC = () => {
  const flagRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (flagRef.current) {
      // はたが風にゆれる
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.14
    }
  })
  const merlonN = 8
  const merlons = Array.from({ length: merlonN }, (_, i) => (i / merlonN) * Math.PI * 2)
  return (
    <group>
      <GroundShadow size={0.95} opacity={0.24} />
      {/* 石積み：3段（darken→base→lighten の色差＋わずかな半径差でブロックを積む） */}
      <mesh castShadow position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.63, 0.66, 0.22, 16]} />
        <meshStandardMaterial color={darken(STONE, 0.18)} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.6, 0.62, 0.28, 16]} />
        <meshStandardMaterial color={STONE} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.58, 0.6, 0.24, 16]} />
        <meshStandardMaterial color={lighten(STONE, 0.14)} roughness={0.8} />
      </mesh>
      {/* 城壁のギザギザ（merlons）を上端にぐるり（小さな箱・明るい石で光を拾う） */}
      {merlons.map((a, i) => (
        <mesh
          key={i}
          castShadow
          position={[Math.cos(a) * 0.54, 0.81, Math.sin(a) * 0.54]}
          rotation={[0, -a, 0]}
        >
          <boxGeometry args={[0.14, 0.16, 0.12]} />
          <meshStandardMaterial color={lighten(STONE, 0.14)} roughness={0.8} />
        </mesh>
      ))}
      {/* 青い円錐屋根（城壁の内側から立ち上がる） */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <coneGeometry args={[0.5, 0.52, 16]} />
        <meshStandardMaterial color="#4f86dd" roughness={0.62} />
      </mesh>
      {/* てっぺんの金のかざり */}
      <mesh castShadow position={[0, 1.29, 0]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color={GOLD} roughness={0.35} emissive={GOLD} emissiveIntensity={0.15} />
      </mesh>
      {/* アーチ窓2つ（石枠で深く：枠が張り出し・灯りは奥に引っ込む） */}
      {([
        { pos: [0, 0.5, 0.58] as [number, number, number], rot: 0 },
        { pos: [-0.57, 0.58, 0] as [number, number, number], rot: -Math.PI / 2 },
      ]).map((w, i) => (
        <group key={i} position={w.pos} rotation={[0, w.rot, 0]}>
          {/* 深い石の枠（外に張り出す） */}
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.28, 0.08]} />
            <meshStandardMaterial color={lighten(STONE, 0.1)} roughness={0.8} />
          </mesh>
          {/* あたたかい灯り（枠の奥に引っ込めて深さを出す） */}
          <mesh position={[0, 0, -0.02]}>
            <boxGeometry args={[0.12, 0.2, 0.04]} />
            <meshStandardMaterial
              color={GLASS_WARM}
              roughness={0.4}
              emissive={GLASS_WARM}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      ))}
      {/* アーチ扉（正面・土台。石枠＋木の扉） */}
      <mesh castShadow position={[0, 0.2, 0.62]}>
        <boxGeometry args={[0.24, 0.34, 0.08]} />
        <meshStandardMaterial color={lighten(STONE, 0.1)} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.18, 0.6]}>
        <boxGeometry args={[0.16, 0.28, 0.05]} />
        <meshStandardMaterial color="#7a5230" roughness={0.72} />
      </mesh>
      {/* 根元の苔のアクセント（少し・つぶした緑の玉を2つ。base=darken／もう1つは明るめ） */}
      <mesh castShadow position={[0.4, 0.06, 0.42]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshStandardMaterial color={darken('#6ea94a', 0.06)} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[-0.34, 0.05, 0.5]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.11, 8, 6]} />
        <meshStandardMaterial color="#7cb85a" roughness={0.85} />
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
