import { RigidBody } from '@react-three/rapier'
import { Coin } from './Coin'
import { Checkpoint } from './Checkpoint'
import { PALETTE } from './design/palette'
import type { Vec3 } from './level'

// 中間休憩の足場（緑＝安全）。単調な登りの中盤に置いて「易→難→易」の緩急を作る。
// 平らな緑パッド＋コイン1つ＋チェックポイント（落ちてもここへ戻れる）。
// レシピ厳守: 箱メッシュ + fixed + auto cuboid、friction は書かない。
export function RestPad({
  position, // [x, 天面の高さ, z]
  size = 3.2,
  r = 12, // チェックポイントの着地キャッチ半径
}: {
  position: Vec3
  size?: number
  r?: number
}) {
  const [x, topY, z] = position
  const h = 0.6
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow position={[x, topY - h / 2, z]}>
          <boxGeometry args={[size, h, size]} />
          <meshStandardMaterial color={PALETTE.safe} />
        </mesh>
      </RigidBody>
      {/* ひとやすみのごほうび（はたの横に浮く） */}
      <Coin position={[x + size * 0.28, topY + 1.0, z]} />
      <Checkpoint position={[x, topY, z]} r={r} />
    </>
  )
}
