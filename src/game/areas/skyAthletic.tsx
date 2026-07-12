import { RigidBody } from '@react-three/rapier'
import { Coin } from '../Coin'
import { Checkpoint } from '../Checkpoint'
import { GoalFlag } from '../GoalFlag'
import { PulseGlow } from '../fx/PulseGlow'
import type { Vec3 } from '../level'

// ───────────────────────────────────────────────────────────────────
// 空中アスレチック（マリオのマップ風）
// 右上の象限 x∈[18,88], z∈[-88,-18] に配置。
// 地上スタート→だんだん高くなる浮島をジャンプで登り→空中の折り返し→高台ゴール。
// 明るい原色のブロック調。落ちても地面(y=0)に戻るだけ。
//
// ★届く設計：足場の天面どうしの鉛直差 ≤1.5m・水平の中心間距離 ≤3.5m を厳守。
//   （キャラ身長~1.3m / ジャンプ~2.1m）。各足場は 2.5〜3m 角と広め。
// ★レシピ厳守：箱メッシュ＋ type="fixed" ＋ colliders="cuboid"。friction は指定しない。
// ───────────────────────────────────────────────────────────────────

// 1つの浮島（足場）。pos は箱の中心。size=[w,h,d]。
function Island({
  pos,
  size,
  color,
}: {
  pos: Vec3
  size: Vec3
  color: string
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh castShadow receiveShadow position={pos}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}

// 浮島の足元のかざり（当たり判定なしの細い柱。見た目だけ）。
function Pillar({ x, z, top }: { x: number; z: number; top: number }) {
  // top（浮島の底）から地面 y=0 まで伸びる細い柱。
  const h = Math.max(0.4, top)
  return (
    <mesh position={[x, h / 2, z]} receiveShadow>
      <boxGeometry args={[0.5, h, 0.5]} />
      <meshStandardMaterial color="#7e57c2" />
    </mesh>
  )
}

// 足場の定義。topY = この足場の「天面の高さ」（ここに立てる）。
// 段差・隙間が制約内であることを設計時に確認済み（下のコメント参照）。
type Step = {
  x: number
  z: number
  topY: number // 天面の高さ（立つ面）
  size: Vec3 // [w,h,d]
  color: string
  pillar?: boolean // 見た目の支柱を出すか
}

// 原色パレット（黄・赤・緑・青を順に）
const C = {
  yellow: '#ffd54a',
  red: '#ef5350',
  green: '#66bb6a',
  blue: '#42a5f5',
  start: '#ffb300',
  goal: '#ab47bc',
}

// ルート（検算済み：天面差 ≤1.4m・水平中心間距離 = 3.0m で全遷移クリア）
// x∈[18,88], z∈[-88,-18] の象限内。中央広場(r<15)・フェンス(±96)は侵さない。
// 主に1軸ずつ 3.0m 進めて確実に届くようにし、原色を順に塗る。
const STEPS: Step[] = [
  // 地上スタート（低い高台。ほぼ地面、上に立てる）
  { x: 24, z: -24, topY: 1.0, size: [4, 2, 4], color: C.start },

  // 上昇する浮島の連なり（X→Zと交互に進みながら +1.3m ずつ登る）
  { x: 27, z: -24, topY: 2.4, size: [2.8, 0.8, 2.8], color: C.yellow, pillar: true },
  { x: 27, z: -27, topY: 3.7, size: [2.8, 0.8, 2.8], color: C.red, pillar: true },
  { x: 30, z: -27, topY: 5.0, size: [2.8, 0.8, 2.8], color: C.green, pillar: true },
  { x: 30, z: -30, topY: 6.3, size: [2.8, 0.8, 2.8], color: C.blue, pillar: true },
  { x: 33, z: -30, topY: 7.6, size: [2.8, 0.8, 2.8], color: C.yellow, pillar: true },
  { x: 33, z: -33, topY: 8.9, size: [2.8, 0.8, 2.8], color: C.red, pillar: true },
  { x: 36, z: -33, topY: 10.2, size: [2.8, 0.8, 2.8], color: C.green, pillar: true },
  { x: 36, z: -36, topY: 11.5, size: [2.8, 0.8, 2.8], color: C.blue, pillar: true },

  // 空中の折り返し（少し広い踊り場）
  { x: 36, z: -39, topY: 12.6, size: [3.2, 0.8, 3.2], color: C.yellow, pillar: true },

  // 折り返してさらに上昇
  { x: 39, z: -39, topY: 13.7, size: [2.8, 0.8, 2.8], color: C.red, pillar: true },
  { x: 39, z: -42, topY: 14.8, size: [2.8, 0.8, 2.8], color: C.green, pillar: true },

  // 高台ゴール（広めの台。最高 ~16m）
  { x: 42, z: -42, topY: 15.9, size: [4.5, 1.0, 4.5], color: C.goal, pillar: true },
]

export function AreaSkyAthletic() {
  return (
    <>
      {STEPS.map((s, i) => {
        const [, h] = s.size
        // 天面 topY = posY + h/2 → posY = topY - h/2
        const posY = s.topY - h / 2
        const pos: Vec3 = [s.x, posY, s.z]
        return (
          <group key={i}>
            <Island pos={pos} size={s.size} color={s.color} />
            {s.pillar && <Pillar x={s.x} z={s.z} top={posY - h / 2} />}
          </group>
        )
      })}

      {/* コイン：各浮島の天面の少し上(約+1.0m)に配置（11枚） */}
      <Coin position={[24, 2.0, -24]} />
      <Coin position={[27, 3.4, -24]} />
      <Coin position={[27, 4.7, -27]} />
      <Coin position={[30, 6.0, -27]} />
      <Coin position={[33, 8.6, -30]} />
      <Coin position={[33, 9.9, -33]} />
      <Coin position={[36, 11.2, -33]} />
      <Coin position={[36, 12.5, -36]} />
      <Coin position={[36, 13.6, -39]} />
      <Coin position={[39, 15.8, -42]} />
      <Coin position={[42, 16.9, -42]} />

      {/* 入口の誘導：地上スタートの高台が光る（「次はここ」） */}
      <PulseGlow position={[24, 1.02, -24]} radius={1.3} />

      {/* チェックポイント：登り口・空中の踊り場。落ちても直近へ戻れる */}
      <Checkpoint position={[24, 1.0, -24]} r={11} />
      <Checkpoint position={[36, 12.6, -39]} r={13} />
      {/* ゴール旗：高台ゴール。到達で大お祝い＋復活地点にもなる */}
      <GoalFlag position={[42, 15.9, -42]} area="sky" label="そらの しま" color="#ab47bc" r={13} />
    </>
  )
}
