import { RigidBody } from '@react-three/rapier'
import { Coin } from '../Coin'
import { RestPad } from '../RestPad'
import { PulseGlow } from '../fx/PulseGlow'
import { Checkpoint } from '../Checkpoint'
import { GoalFlag } from '../GoalFlag'
import type { Vec3 } from '../level'

// ============================================================================
// 上空の綱渡り（つなわたり）コース
// 北西エリア x ∈ [-46,-16], z ∈ [16,46] に配置。
// 中央広場 r<15・他象限・フェンス±96 は侵さない。
//
// 流れ：
//  (1) 地上 → ジャンプで登れる階段状の足場で高さ ~8m まで登る。
//  (2) そこから先は「ジャンプ無しで歩いて渡れる」細い一本道（連続した梁）。
//      道幅は太い(1.6m)→細い(0.8m)に変化＋ジグザグに曲がる。高さ ~8〜13m。
//  (3) 渡りきると高台ゴール＋コイン。
//  落ちても地面 y=0 に戻るだけ。
//
// 当たり判定レシピ（厳守）:
//  - 全パーツ = 箱メッシュ + type="fixed" RigidBody + colliders="cuboid"。
//  - friction は書かない（undefined を渡すと NaN→panic になるため）。
//  - RigidBody を scale した group に入れない。斜めの薄い箱を多用しない。
//  - 合計パーツ数は控えめ（当たり判定 ≤30）。
//
// 渡り部分の安全設計（重要）:
//  - 梁どうしは端を必ずオーバーラップさせて連続させる（すき間なし）。
//  - 隣りあう梁の天面の段差は ≤0.25m。
//  - 最小の道幅は 0.8m（キャラ半径0.3m が歩ける下限）。0.8m未満は作らない。
//  - ジグザグは梁の向き（X向き / Z向き）を 90度きざみで切り替えて作る＝軸並行を保つ。
// ============================================================================

const THICK = 0.6 // 梁・足場の厚み（共通）

// 階段の足場（ジャンプで登る）。topY は天面の高さ。
type Step = {
  x: number
  z: number
  topY: number
  size: Vec3 // [w, h, d]
  color: string
}

// 綱渡りの梁（歩いて渡る）。向き 'x' = X方向に長い / 'z' = Z方向に長い。
// topY は天面の高さ。len = 長い方の長さ、width = 道幅(細い方)。
type Beam = {
  x: number
  z: number
  topY: number
  len: number
  width: number
  dir: 'x' | 'z'
  color: string
}

const C = {
  start: '#ffb300',
  s1: '#ffd54a',
  s2: '#ffa726',
  s3: '#ff7043',
  rope1: '#ffd740', // 黄
  rope2: '#ffa000', // オレンジ
  rope3: '#ff5252', // 赤
  goal: '#ab47bc',
}

// ── (1) 登り階段 ──────────────────────────────────────────────
// 地上(x=-20,z=20)付近 → 綱渡り開始点(高さ ~8m)まで。
// 天面の鉛直差 ≤1.5m・水平の中心間距離 ≤3.0m を厳守（ジャンプ ~2.1m で届く）。
// 検算：各遷移は片軸 3.0m 進み、天面差は 1.0〜1.4m。
const STEPS: Step[] = [
  { x: -20.0, z: 20.0, topY: 1.0, size: [3.6, 2.0, 3.6], color: C.start },
  { x: -23.0, z: 20.0, topY: 2.3, size: [2.8, THICK, 2.8], color: C.s1 },
  { x: -23.0, z: 23.0, topY: 3.6, size: [2.8, THICK, 2.8], color: C.s2 },
  { x: -26.0, z: 23.0, topY: 4.9, size: [2.8, THICK, 2.8], color: C.s3 },
  { x: -26.0, z: 26.0, topY: 6.2, size: [2.8, THICK, 2.8], color: C.s1 },
  { x: -29.0, z: 26.0, topY: 7.4, size: [2.8, THICK, 2.8], color: C.s2 },
  // 登りきり：少し広い踊り場（ここから綱渡り開始。天面 8.0m）
  { x: -29.0, z: 29.0, topY: 8.0, size: [3.2, THICK, 3.2], color: C.start },
]

// ── (2) 綱渡り本体（歩いて渡る連続路）──────────────────────────
// 踊り場 (x=-29,z=29,top8.0) の縁から、X向き/Z向きの梁を端でオーバーラップ
// させながら隙間なく連結。道幅は 1.6→1.2→0.8→1.0→1.4 と変化。段差 ≤0.25m。
// ジグザグは dir を x↔z で切り替え（軸並行のまま方向転換）。
//
// 連続性の検算（端のオーバーラップ・段差）はコメントで都度確認している。
// 高さは 8.0 → 8.2 → ... と細かく上下し、最大 ~12.8m、最終 ~12.6m。
const BEAMS: Beam[] = [
  // 踊り場の縁(x≈-30.6)から西へ。X向き梁、幅1.6m（太い・渡りはじめは安心）。
  // 梁中心 x=-33, len=8 → x∈[-37,-29]。踊り場(x∈[-30.6,-27.4])と x=-29〜-30.6 で重なる。
  { x: -33.0, z: 29.0, topY: 8.0, len: 8, width: 1.6, dir: 'x', color: C.rope1 },

  // 角で南へ折れる（ジグザグ①）。Z向き梁、幅1.2m。
  // 中心 x=-36.5, z=32 → z∈[28,36]、x∈[-37.1,-35.9]。
  // 直前のX梁(x∈[-37,-29], z∈[28.2,29.8]) と x≈-36.5,z≈29 付近で重なる。段差0。
  { x: -36.5, z: 32.0, topY: 8.0, len: 8, width: 1.2, dir: 'z', color: C.rope2 },

  // 角で東へ折れる（ジグザグ②）。X向き梁、幅0.8m（一番細い＝スリル）。少し上げる(+0.2)。
  // 中心 x=-33, z=35.5 → x∈[-37,-29]、z∈[35.1,35.9]。
  // 直前のZ梁(z∈[28,36], x∈[-37.1,-35.9]) と x≈-36.5,z≈35.5 で重なる。段差0.2≤0.25。
  { x: -33.0, z: 35.5, topY: 8.2, len: 8, width: 0.8, dir: 'x', color: C.rope3 },

  // 角で南へ折れる（ジグザグ③）。Z向き梁、幅1.0m。少し上げる(+0.2)。
  // 中心 x=-30.0, z=38.5 → z∈[34.5,42.5]、x∈[-30.5,-29.5]。
  // 直前のX梁(x∈[-37,-29], z∈[35.1,35.9]) と x≈-30,z≈35.5 で重なる。段差0.2≤0.25。
  { x: -30.0, z: 38.5, topY: 8.4, len: 8, width: 1.0, dir: 'z', color: C.rope1 },

  // 角で西へ折れる（ジグザグ④）。X向き梁、幅1.4m（太め・ひと休み）。+0.2。
  // 中心 x=-33.5, z=41.5 → x∈[-37.5,-29.5]、z∈[40.8,42.2]。
  // 直前のZ梁(z∈[34.5,42.5], x∈[-30.5,-29.5]) と x≈-30,z≈41.5 で重なる。段差0.2≤0.25。
  { x: -33.5, z: 41.5, topY: 8.6, len: 8, width: 1.4, dir: 'x', color: C.rope2 },

  // 角で北へ折れ戻る（ジグザグ⑤）。Z向き梁、幅0.8m（細い）。+0.2。
  // 中心 x=-37.0, z=38.0 → z∈[34,42]、x∈[-37.4,-36.6]。
  // 直前のX梁(x∈[-37.5,-29.5], z∈[40.8,42.2]) と x≈-37,z≈41.5 で重なる。段差0.2≤0.25。
  { x: -37.0, z: 38.0, topY: 8.8, len: 8, width: 0.8, dir: 'z', color: C.rope3 },

  // 角で西へ（ジグザグ⑥）。X向き梁、幅1.2m。+0.2。
  // 中心 x=-40.5, z=34.5 → x∈[-44.5,-36.5]、z∈[33.9,35.1]。
  // 直前のZ梁(z∈[34,42], x∈[-37.4,-36.6]) と x≈-37,z≈34.5 で重なる。段差0.2≤0.25。
  { x: -40.5, z: 34.5, topY: 9.0, len: 8, width: 1.2, dir: 'x', color: C.rope1 },

  // 角で北へ（ジグザグ⑦）。Z向き梁、幅1.0m。+0.2。最後の渡り。
  // 中心 x=-43.5, z=31.0 → z∈[27,35]、x∈[-44.0,-43.0]。
  // 直前のX梁(x∈[-44.5,-36.5], z∈[33.9,35.1]) と x≈-43.5,z≈34.5 で重なる。段差0.2≤0.25。
  { x: -43.5, z: 31.0, topY: 9.2, len: 8, width: 1.0, dir: 'z', color: C.rope2 },
]

// ── (3) 高台ゴール ──────────────────────────────────────────────
// 最後のZ梁(z∈[27,35], x∈[-44.0,-43.0], top9.2)の北端につなぐ広い台。
// 中心 x=-43.0, z=24.5, top9.2 → x∈[-46.0,-40.0], z∈[21.5,27.5]。
// 最後の梁(z≈27,x≈-43.5) と z=27〜27.5 で重なる。段差0。範囲内（x≥-46）。
const GOAL: Step = { x: -43.0, z: 24.5, topY: 9.2, size: [6, 1.0, 6], color: C.goal }

// 階段足場のメッシュ＋当たり判定。中心 y は天面が topY になるよう topY - h/2。
function StepBox({ s }: { s: Step }) {
  const h = s.size[1]
  const centerY = s.topY - h / 2
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh castShadow receiveShadow position={[s.x, centerY, s.z]}>
        <boxGeometry args={s.size} />
        <meshStandardMaterial color={s.color} />
      </mesh>
    </RigidBody>
  )
}

// 綱渡りの梁のメッシュ＋当たり判定。dir で長辺の向きを決める（軸並行）。
function BeamBox({ b }: { b: Beam }) {
  const centerY = b.topY - THICK / 2
  // 'x' = X方向に長い: size=[len, THICK, width]
  // 'z' = Z方向に長い: size=[width, THICK, len]
  const size: Vec3 = b.dir === 'x' ? [b.len, THICK, b.width] : [b.width, THICK, b.len]
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh castShadow receiveShadow position={[b.x, centerY, b.z]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={b.color} />
      </mesh>
    </RigidBody>
  )
}

// 梁の下に伸びる細い支柱（見た目だけ・当たり判定なし）。「空中の細道」感を出す。
function Strut({ x, z, top }: { x: number; z: number; top: number }) {
  const h = Math.max(0.4, top)
  return (
    <mesh position={[x, h / 2, z]} receiveShadow>
      <boxGeometry args={[0.25, h, 0.25]} />
      <meshStandardMaterial color="#8d6e63" />
    </mesh>
  )
}

// コイン：登り・綱渡り・ゴールに配置（計10個）。梁の天面 +1.0m あたりに浮かべる。
const COIN_POSITIONS: Vec3[] = [
  // 登り
  [-23.0, 3.3, 20.0],
  [-26.0, 5.9, 23.0],
  [-29.0, 9.0, 29.0], // 踊り場の上
  // 綱渡り（各梁の上）
  [-33.0, 9.0, 29.0],
  [-36.5, 9.0, 32.0],
  [-33.0, 9.2, 35.5],
  [-33.5, 9.6, 41.5],
  [-40.5, 10.0, 34.5],
  [-43.5, 10.2, 31.0],
  // ゴール
  [-43.0, 10.4, 24.5],
]

export function AreaTightrope() {
  return (
    <>
      {/* (1) 登り階段（ジャンプで登る） */}
      {STEPS.map((s, i) => (
        <StepBox key={`step-${i}`} s={s} />
      ))}

      {/* (2) 綱渡り本体（歩いて渡る）＋ 見た目の支柱 */}
      {BEAMS.map((b, i) => (
        <BeamBox key={`beam-${i}`} b={b} />
      ))}
      {BEAMS.map((b, i) => (
        <Strut key={`strut-${i}`} x={b.x} z={b.z} top={b.topY - THICK} />
      ))}

      {/* (3) 高台ゴール */}
      <StepBox s={GOAL} />

      {/* コイン */}
      {COIN_POSITIONS.map((p, i) => (
        <Coin key={`coin-${i}`} position={p} />
      ))}

      {/* 入口の誘導：登り口の台が光る（「次はここ」） */}
      <PulseGlow position={[-20, 1.02, 20]} radius={1.3} />
      {/* 中間休憩：綱のジグザグ④⑤の角に緑パッド＋コイン＋チェックポイント。
          梁(top8.6/8.8)と端が重なる配置＝段差≤0.2で歩いて乗れる */}
      <RestPad position={[-37.0, 8.8, 41.5]} size={2.6} r={12} />

      {/* チェックポイント：登り口・綱渡りの踊り場 */}
      <Checkpoint position={[-20, 1.0, 20]} r={11} />
      <Checkpoint position={[-29, 8.0, 29]} r={13} />
      {/* ゴール旗：綱を渡りきった高台ゴール */}
      <GoalFlag position={[-43, 9.2, 24.5]} area="tightrope" label="つなわたり" color="#ab47bc" r={12} />
    </>
  )
}
