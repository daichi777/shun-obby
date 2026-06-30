import { RigidBody } from '@react-three/rapier'
import { Coin } from '../Coin'
import { FlowingWater } from '../Water'
import type { Vec3 } from '../level'

// ============================================================================
// とびいしジャンプコース
// 水の上に点々と置かれた飛び石を、ジグザグにジャンプで渡っていくアスレチック。
// だんだん高くなり、奥へ進む。落ちても地面(y=0)にもどるだけなので安心。
//
// 配置範囲（左上の象限）: x ∈ [-88, -18], z ∈ [-88, -18]
// 中央広場 r<15・他象限・フェンス±96 は侵さない。
//
// 当たり判定レシピ（厳守）:
//  - 飛び石 = box メッシュ + fixed RigidBody + auto cuboid。friction は書かない。
//  - 水は「見た目だけ」= RigidBody 無しの素の <mesh>（当たり判定なし）。
// ============================================================================

// 飛び石の平面サイズ（乗りやすいよう 2.4m 角）と厚み。
const STONE_W = 2.4
const STONE_D = 2.4
const STONE_THICK = 1.0

// 飛び石は [中心x, 上面の高さ topY, 中心z] で定義する。
// 隣どうしの水平の隙間(エッジ間) ≤ 2.44m、鉛直差 ≤ 0.6m に収めてあるので
// （キャラはジャンプで約2.1m上がる）必ず届く。
const STONES: Array<[number, number, number]> = [
  [-82.0, 0.6, -28.5],
  [-78.2, 1.0, -31.5],
  [-74.4, 1.5, -28.5],
  [-70.6, 2.0, -31.5],
  [-66.8, 2.6, -28.5],
  [-63.0, 3.2, -31.5],
  [-59.2, 3.8, -28.5],
  [-55.4, 4.4, -31.5],
  [-51.6, 5.0, -28.5],
  [-47.8, 5.5, -31.5],
  [-44.0, 6.0, -28.5],
  [-40.2, 6.5, -31.5],
  [-36.4, 7.0, -28.5],
  [-32.6, 7.5, -31.5],
]

// 灰色〜明るい石の2色を交互にして見やすく。
const STONE_COLORS = ['#9aa3ac', '#c2c9d0']

// 飛び石1つ（メッシュ + fixed RigidBody + auto cuboid）。
// 中心yは「上面が topY になる」よう topY - 厚み/2 にそろえる。
function Stone({ topY, x, z, color }: { topY: number; x: number; z: number; color: string }) {
  const centerY = topY - STONE_THICK / 2
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh castShadow receiveShadow position={[x, centerY, z]}>
        <boxGeometry args={[STONE_W, STONE_THICK, STONE_D]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </RigidBody>
  )
}

// コイン配置（飛び石の上 +1.0m や、すき間の途中に浮かせる）。計10個。
const COIN_POSITIONS: Vec3[] = [
  // 飛び石の上にちょこん（+1.0m）
  [-82.0, 1.6, -28.5],
  [-74.4, 2.5, -28.5],
  [-66.8, 3.6, -28.5],
  [-59.2, 4.8, -28.5],
  [-51.6, 6.0, -28.5],
  [-44.0, 7.0, -28.5],
  [-36.4, 8.0, -28.5],
  // すき間の途中（ジャンプの弧の上あたり）に浮かべる
  [-80.1, 1.6, -30.0],
  [-72.5, 2.5, -30.0],
  [-64.9, 3.7, -30.0],
]

export function AreaJumpCourse() {
  return (
    <>
      {/* 水（見た目だけ・当たり判定なし）。本当に流れて波打つ水面を敷く。
          RigidBody は無いので素通り＝飛び石だけ乗れる。 */}
      <FlowingWater
        position={[-57.0, 0.14, -30.0]}
        size={[62, 24]}
        flow={[0.12, 0.02]}
        repeat={[4, 2]}
        color="#3fb0ee"
        highlight="#cfeeff"
        opacity={0.82}
        waveHeight={0.12}
      />

      {/* 飛び石（当たり判定あり） */}
      {STONES.map(([x, topY, z], i) => (
        <Stone key={i} x={x} topY={topY} z={z} color={STONE_COLORS[i % STONE_COLORS.length]} />
      ))}

      {/* コイン */}
      {COIN_POSITIONS.map((p, i) => (
        <Coin key={i} position={p} />
      ))}
    </>
  )
}
