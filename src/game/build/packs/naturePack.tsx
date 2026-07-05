import { useRef } from 'react'
import type { FC } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'
import { lighten, darken, GroundShadow, Sway } from './kit'

// nature パック（き / おはな / きのこ / にじ）
// three.js プリミティブのみ・原点中心・底面 y=0・footprint 内。drei/画像/追加ライト禁止。
// 共有キット（lighten/darken=2トーン陰影, GroundShadow=接地影, Sway=アイドル揺れ）で全パック統一。
// CELL=4 前提のチャンキーサイズ。id/name/emoji/price/footprint とサイズは不変（今回は磨き上げのみ）。

// ---- 共通パレット ----
const BARK = '#9c5a2c' // 樹皮
const LEAF = '#54b95a' // 葉
const APPLE = '#ff5a52' // りんご
const PINK = '#ff6aa8' // 花びら
const LEAFG = '#52c46a' // 葉（花）
const STEM = '#3fae57' // 茎
const SOIL = '#7a5a3a' // 土
const CORE = '#ffd23a' // 花芯
const MUSH = '#f0483f' // きのこのかさ
const STEMC = '#fff3e0' // きのこの柄

// =====================================================================
// き: 太い幹（根の張り出し＋2トーン樹皮）＋はっきり分かれた4房のもこもこ葉
//    （各房＝球＋尖りでツンツン輪郭）＋房の間から顔をだすりんご。
//    <Sway mode='sway'> で幹支点にそよぐ。footprint[1,1] → x,z ±0.5。目標高さ ≈0.9。
// =====================================================================
const Tree: FC = () => (
  <group>
    <GroundShadow size={0.42} />
    <Sway mode="sway" amp={0.045} speed={1.1} phase={0.4}>
      {/* 根の張り出し（3方向・暗い樹皮の平たいふくらみ） */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5
        return (
          <mesh
            key={`root${i}`}
            castShadow
            position={[Math.cos(a) * 0.12, 0.03, Math.sin(a) * 0.12]}
            scale={[1, 0.4, 1]}
          >
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={darken(BARK, 0.3)} roughness={0.9} />
          </mesh>
        )
      })}
      {/* 根元フレア（ふくらみ・暗め樹皮） */}
      <mesh castShadow position={[0, 0.06, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={darken(BARK, 0.18)} roughness={0.9} />
      </mesh>
      {/* 幹（上細り・樹皮ベース色） */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.115, 0.34, 8]} />
        <meshStandardMaterial color={BARK} roughness={0.82} />
      </mesh>
      {/* 幹のこぶ（前面・明るい樹皮のハイライト＝2トーンの物語ディテール） */}
      <mesh castShadow position={[0.07, 0.24, 0.05]} scale={[0.9, 1, 0.7]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color={lighten(BARK, 0.16)} roughness={0.78} />
      </mesh>

      {/* === 葉：はっきり分かれた4房（房ごとに色差＝シルエットの陰影） === */}
      {/* C1 手前ひだり（ベース緑） */}
      <mesh castShadow position={[-0.18, 0.5, 0.06]}>
        <sphereGeometry args={[0.2, 14, 12]} />
        <meshStandardMaterial color={LEAF} roughness={0.7} />
      </mesh>
      {/* C2 みぎ（明るい緑） */}
      <mesh castShadow position={[0.19, 0.52, -0.02]}>
        <sphereGeometry args={[0.19, 14, 12]} />
        <meshStandardMaterial color={lighten(LEAF, 0.1)} roughness={0.68} />
      </mesh>
      {/* C3 奥（影の房＝暗い緑） */}
      <mesh castShadow position={[-0.02, 0.5, -0.18]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={darken(LEAF, 0.16)} roughness={0.72} />
      </mesh>
      {/* C4 てっぺん（明るい緑） */}
      <mesh castShadow position={[0.03, 0.67, 0.03]}>
        <sphereGeometry args={[0.16, 14, 12]} />
        <meshStandardMaterial color={lighten(LEAF, 0.05)} roughness={0.68} />
      </mesh>

      {/* ツンツンの尖り（房の上に明るい小コーン＝輪郭にトゲ感） */}
      <mesh castShadow position={[0.03, 0.8, 0.02]}>
        <coneGeometry args={[0.06, 0.12, 7]} />
        <meshStandardMaterial color={lighten(LEAF, 0.22)} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-0.2, 0.66, 0.06]} rotation={[0, 0, 0.25]}>
        <coneGeometry args={[0.05, 0.1, 6]} />
        <meshStandardMaterial color={lighten(LEAF, 0.2)} roughness={0.62} />
      </mesh>
      <mesh castShadow position={[0.21, 0.67, -0.02]} rotation={[0, 0, -0.25]}>
        <coneGeometry args={[0.05, 0.1, 6]} />
        <meshStandardMaterial color={lighten(LEAF, 0.2)} roughness={0.62} />
      </mesh>
      <mesh castShadow position={[-0.02, 0.63, -0.18]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.04, 0.08, 6]} />
        <meshStandardMaterial color={lighten(LEAF, 0.12)} roughness={0.66} />
      </mesh>

      {/* ハイライト房（上面のつや・明るい緑） */}
      <mesh position={[-0.22, 0.6, 0.16]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={lighten(LEAF, 0.3)} roughness={0.6} />
      </mesh>
      <mesh position={[0.22, 0.62, 0.1]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={lighten(LEAF, 0.3)} roughness={0.6} />
      </mesh>

      {/* りんご（房の間から顔をだす） */}
      <mesh castShadow position={[0.29, 0.5, 0.14]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color={APPLE} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[-0.27, 0.56, 0.16]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color={APPLE} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0.06, 0.66, -0.22]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial color={darken(APPLE, 0.1)} roughness={0.5} />
      </mesh>
    </Sway>
  </group>
)

// =====================================================================
// おはな: 土の盛り＋芝、太めの茎、3枚の葉、外側へ開いた立体的な多層花びら
//    （外＝濃/内＝淡の濃淡2層・少し上向きで厚み）、黄色い芯。
//    <Sway mode='bob'> でふるふる。footprint[1,1]。目標高さ ≈0.44。
// =====================================================================
const Flower: FC = () => {
  const outer = [0, 1, 2, 3, 4, 5] as const
  const inner = [0, 1, 2, 3, 4] as const
  return (
    <group>
      <GroundShadow size={0.28} />
      {/* 土の盛り（暗め） */}
      <mesh castShadow receiveShadow position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.04, 14]} />
        <meshStandardMaterial color={darken(SOIL, 0.15)} roughness={0.9} />
      </mesh>
      {/* 芝（小さな緑の葉・根元をにぎやかに） */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.6
        return (
          <group key={`g${i}`} rotation={[0, a, 0]}>
            <mesh castShadow position={[0.1, 0.07, 0]} rotation={[0, 0, -0.35]}>
              <coneGeometry args={[0.018, 0.11, 5]} />
              <meshStandardMaterial color={lighten(LEAFG, 0.08)} roughness={0.7} />
            </mesh>
          </group>
        )
      })}

      {/* 揺れる本体（茎・葉・花） */}
      <Sway mode="bob" amp={0.03} speed={1.6} phase={1.1}>
        {/* 茎（少し太く） */}
        <mesh castShadow position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.028, 0.038, 0.3, 8]} />
          <meshStandardMaterial color={STEM} roughness={0.75} />
        </mesh>
        {/* 葉っぱ（ひだり・大） */}
        <mesh castShadow position={[-0.1, 0.18, 0]} rotation={[0, 0, 1.0]} scale={[1, 0.35, 0.55]}>
          <sphereGeometry args={[0.095, 10, 8]} />
          <meshStandardMaterial color={LEAFG} roughness={0.72} />
        </mesh>
        {/* 葉っぱ（みぎ・中・明るい） */}
        <mesh castShadow position={[0.1, 0.13, 0]} rotation={[0, 0, -1.0]} scale={[1, 0.35, 0.55]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshStandardMaterial color={lighten(LEAFG, 0.12)} roughness={0.72} />
        </mesh>
        {/* 葉っぱ（手前・下・暗い） */}
        <mesh castShadow position={[0, 0.11, 0.09]} rotation={[0.95, 0, 0]} scale={[1, 0.32, 0.5]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color={darken(LEAFG, 0.14)} roughness={0.72} />
        </mesh>
        {/* がく */}
        <mesh castShadow position={[0, 0.32, 0]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={darken(LEAFG, 0.08)} roughness={0.72} />
        </mesh>

        {/* 花びら 外層（濃いピンク・外へ開いて厚み） */}
        {outer.map((i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <group key={`op${i}`} rotation={[0, a, 0]}>
              <mesh castShadow position={[0.085, 0.35, 0]} rotation={[0, 0, 0.5]} scale={[1.5, 0.42, 0.95]}>
                <sphereGeometry args={[0.05, 10, 8]} />
                <meshStandardMaterial color={darken(PINK, 0.06)} roughness={0.55} />
              </mesh>
            </group>
          )
        })}
        {/* 花びら 内層（淡いピンク・より上向き・半ステップずらし） */}
        {inner.map((i) => {
          const a = (i / 5) * Math.PI * 2 + Math.PI / 5
          return (
            <group key={`ip${i}`} rotation={[0, a, 0]}>
              <mesh castShadow position={[0.05, 0.385, 0]} rotation={[0, 0, 0.85]} scale={[1.3, 0.42, 0.8]}>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshStandardMaterial color={lighten(PINK, 0.3)} roughness={0.5} />
              </mesh>
            </group>
          )
        })}
        {/* 芯（黄色） */}
        <mesh castShadow position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={CORE} roughness={0.5} />
        </mesh>
        {/* 芯のハイライト */}
        <mesh position={[-0.018, 0.425, 0.03]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={lighten(CORE, 0.35)} roughness={0.4} />
        </mesh>
      </Sway>
    </group>
  )
}

// =====================================================================
// きのこ: ぷっくり半球のかさ＋ふちの scallop(波・下がり)＋暗いかさ裏＋上面ハイライト、
//    はっきりした白水玉、太い柄＋ほっぺ＆目。<Sway mode='breathe'> で呼吸。
//    footprint[1,1]。目標高さ ≈0.4。
// =====================================================================
const Mushroom: FC = () => (
  <group>
    <GroundShadow size={0.34} />
    <Sway mode="breathe" amp={0.03} speed={1.3} phase={2.0}>
      {/* 柄（太いクリーム色） */}
      <mesh castShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.1, 0.135, 0.2, 12]} />
        <meshStandardMaterial color={STEMC} roughness={0.7} />
      </mesh>
      {/* かさ裏（暗い・下がりの根元） */}
      <mesh position={[0, 0.185, 0]}>
        <cylinderGeometry args={[0.235, 0.2, 0.05, 16]} />
        <meshStandardMaterial color={darken(MUSH, 0.32)} roughness={0.8} />
      </mesh>
      {/* かさ本体（赤半球・軽くつぶしてぷっくり） */}
      <mesh castShadow position={[0, 0.19, 0]} scale={[1, 0.82, 1]}>
        <sphereGeometry args={[0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={MUSH} roughness={0.5} />
      </mesh>
      {/* かさ上面ハイライト（明るい赤の半球キャップ） */}
      <mesh position={[-0.04, 0.32, -0.02]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.13, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={lighten(MUSH, 0.28)} roughness={0.45} />
      </mesh>
      {/* ふちの scallop（波・下がり）8つ */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={`sc${i}`}
            castShadow
            position={[Math.cos(a) * 0.225, 0.175, Math.sin(a) * 0.225]}
            scale={[1, 0.7, 1]}
          >
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color={darken(MUSH, 0.06)} roughness={0.55} />
          </mesh>
        )
      })}
      {/* 白い水玉（大きく・まっしろ・はっきり） */}
      <mesh castShadow position={[0, 0.37, 0.01]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.056, 10, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} />
      </mesh>
      <mesh castShadow position={[0.14, 0.3, 0.05]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} />
      </mesh>
      <mesh castShadow position={[-0.12, 0.29, 0.07]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} />
      </mesh>
      <mesh castShadow position={[0.05, 0.28, -0.16]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} />
      </mesh>
      {/* 目（ちいさな黒い点） */}
      <mesh position={[0.045, 0.13, 0.11]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color="#4a3a34" roughness={0.5} />
      </mesh>
      <mesh position={[-0.045, 0.13, 0.11]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color="#4a3a34" roughness={0.5} />
      </mesh>
      {/* ほっぺ（ピンク） */}
      <mesh position={[0.085, 0.11, 0.1]} scale={[1, 0.75, 0.5]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial color="#ff9ec2" roughness={0.6} />
      </mesh>
      <mesh position={[-0.085, 0.11, 0.1]} scale={[1, 0.75, 0.5]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial color="#ff9ec2" roughness={0.6} />
      </mesh>
    </Sway>
  </group>
)

// =====================================================================
// にじ: 6色の太い半円アーチ。各帯にベース(暗め)＋上面のつやリング(明るい・淡い emissive)で
//    立体感。両端のふわふわ雲は上=白/下=影の2トーン。雲の下に小さな接地影。
//    既存のふわり浮遊は維持。footprint[2,2]。目標高さ ≈0.85。
// =====================================================================
const Rainbow: FC = () => {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) {
      // 0〜+0.04 の範囲でふわり浮く（静止時は y≈0 接地・常に地面以上）。
      ref.current.position.y = (Math.sin(state.clock.elapsedTime * 1.2) + 1) * 0.02
    }
  })
  const tube = 0.06
  const bands: { r: number; color: string }[] = [
    { r: 0.8, color: '#ff5c5c' }, // 赤
    { r: 0.68, color: '#ff9f45' }, // 橙
    { r: 0.56, color: '#ffd84d' }, // 黄
    { r: 0.44, color: '#58cc6a' }, // 緑
    { r: 0.32, color: '#4aa8ff' }, // 青
    { r: 0.2, color: '#a578e8' }, // 紫
  ]
  // ふわふわ雲（球の房）。上=まっしろ / 下=うっすら影で2トーン。
  const cloudPuffs: { p: [number, number, number]; r: number; color: string }[] = [
    { p: [0, 0.15, 0], r: 0.16, color: '#ffffff' },
    { p: [0.16, 0.11, 0.05], r: 0.11, color: '#ffffff' },
    { p: [-0.15, 0.1, -0.04], r: 0.11, color: darken('#ffffff', 0.08) },
    { p: [0.02, 0.09, -0.12], r: 0.09, color: darken('#ffffff', 0.13) },
  ]
  return (
    <group>
      {/* 接地影（雲の下に小さく・浮遊しても地面に残る） */}
      <group position={[-0.5, 0, 0]}>
        <GroundShadow size={0.26} opacity={0.16} />
      </group>
      <group position={[0.5, 0, 0]}>
        <GroundShadow size={0.26} opacity={0.16} />
      </group>

      <group ref={ref}>
        {/* アーチ本体（上半分の半リング・XY平面）。足元は y≈0 で接地 */}
        <group position={[0, 0.02, 0]}>
          {bands.map((b) => (
            <group key={b.color}>
              {/* ベース（暗め・淡い emissive） */}
              <mesh castShadow>
                <torusGeometry args={[b.r, tube, 8, 20, Math.PI]} />
                <meshStandardMaterial
                  color={darken(b.color, 0.06)}
                  roughness={0.55}
                  emissive={b.color}
                  emissiveIntensity={0.12}
                />
              </mesh>
              {/* 上面のつやリング（明るい・前面に薄く） */}
              <mesh position={[0, 0.008, 0.035]}>
                <torusGeometry args={[b.r, tube * 0.42, 6, 20, Math.PI]} />
                <meshStandardMaterial
                  color={lighten(b.color, 0.35)}
                  roughness={0.4}
                  emissive={lighten(b.color, 0.4)}
                  emissiveIntensity={0.18}
                />
              </mesh>
            </group>
          ))}
        </group>
        {/* 左の雲（アーチの足を包む） */}
        <group position={[-0.5, 0, 0]}>
          {cloudPuffs.map((c, i) => (
            <mesh key={`l${i}`} castShadow position={c.p}>
              <sphereGeometry args={[c.r, 12, 10]} />
              <meshStandardMaterial color={c.color} roughness={0.85} />
            </mesh>
          ))}
        </group>
        {/* 右の雲（左右ミラー） */}
        <group position={[0.5, 0, 0]} scale={[-1, 1, 1]}>
          {cloudPuffs.map((c, i) => (
            <mesh key={`r${i}`} castShadow position={c.p}>
              <sphereGeometry args={[c.r, 12, 10]} />
              <meshStandardMaterial color={c.color} roughness={0.85} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

export const natureItems: PackItem[] = [
  {
    id: 'ki',
    name: 'き',
    emoji: '🌳',
    price: 4,
    footprint: [1, 1],
    Model: Tree,
    // 幹だけ軽く固体化（葉はすり抜けOK）。friction は渡さない（rapier既定）。
    collider: { boxes: [{ args: [0.13, 0.2, 0.13], position: [0, 0.2, 0] }] },
  },
  { id: 'ohana', name: 'おはな', emoji: '🌷', price: 1, footprint: [1, 1], Model: Flower, collider: 'none' },
  { id: 'kinoko', name: 'きのこ', emoji: '🍄', price: 2, footprint: [1, 1], Model: Mushroom, collider: 'none' },
  { id: 'niji', name: 'にじ', emoji: '🌈', price: 7, footprint: [2, 2], Model: Rainbow, collider: 'none' },
]
