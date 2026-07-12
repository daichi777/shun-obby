import { RigidBody } from '@react-three/rapier'
import { Coin } from '../Coin'
import { PulseGlow } from '../fx/PulseGlow'
import type { Vec3 } from '../level'

// ============================================================================
// 🌟 スターターパス（最初の30秒の導線・ワードレスオンボーディング）
// スポーン（0,3,2）から「カメラに映る」西へ向かって、
// 「コインの点線 → 低い練習ジャンプパッド3段 → おてほんの すべりだい」と
// 視線と足が自然につながる（固定カメラは -z 向きなので +z 側に置くと見えない）。
//   ・パッドは box + fixed + auto cuboid、friction は書かない（レシピ厳守）
//   ・最初のパッドに脈動する光リング＋光柱ビーコン（文字なしで「ここだよ」）
//   ・動く床レーン（z=±6±2.5）は避ける（z≦3 に収める。コインはプレイヤー判定なのでOK）
// ============================================================================

// 練習パッド: だんだん高くなる3段（ジャンプ高 ~2m に対して 0.35→0.6→0.9 はやさしい）
const PADS: { pos: Vec3; size: Vec3; color: string }[] = [
  { pos: [-7.5, 0.175, 2.8], size: [2.2, 0.35, 2.2], color: '#ff8fab' },
  { pos: [-10.5, 0.3, 2.6], size: [2.2, 0.6, 2.2], color: '#ffd166' },
  { pos: [-13.5, 0.45, 2.2], size: [2.2, 0.9, 2.2], color: '#7ddb6e' },
]

// コインの点線: スポーン（-3,2.5）の少し先 → パッドの上 → おてほんの すべりだいへ。
// ※ スポーン直上に置かない（コインは5秒で復活するので、立っているだけで
//    勝手に拾い続けてしまう）。最寄りでも 2m 以上はなす。
const STARTER_COINS: Vec3[] = [
  [-5.2, 1.0, 2.8],
  [-7.5, 1.1, 2.8], // パッド1の上
  [-10.5, 1.35, 2.6], // パッド2の上
  [-13.5, 1.65, 2.2], // パッド3の上
  [-16.5, 1.0, 1.2], // すべりだいへの続き
  [-19.0, 1.0, 0.5],
]

export function AreaStarterPath() {
  return (
    <>
      {/* 練習ジャンプパッド（レシピ: box + fixed + auto cuboid・friction なし） */}
      {PADS.map((p, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid" position={p.pos}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={p.size} />
            <meshStandardMaterial color={p.color} />
          </mesh>
        </RigidBody>
      ))}

      {/* 最初のパッドの根もとにビーコン（ワードレスの「ここだよ」。共通 PulseGlow） */}
      <PulseGlow position={[PADS[0].pos[0], 0.35, PADS[0].pos[2]]} radius={1.45} beam />

      {/* コインの点線 */}
      {STARTER_COINS.map((p, i) => (
        <Coin key={`c${i}`} position={p} />
      ))}
    </>
  )
}
