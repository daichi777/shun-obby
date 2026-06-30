import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'

// 乗ると勝手に運んでくれる「動く床」。マップの端から端まで往復する。
//   ・kinematicPosition の RigidBody を毎フレーム setNextKinematicTranslation で動かす。
//     ecctrl は「動く床(bodyType 2)に乗っている」と検知して、その速度でキャラを運ぶ
//     （followPlatform は ecctrl 既定で true）。だから乗り続けるかぎり一緒にスライドする。
//   ・行き(左→右)と帰り(右→左)の2レーン。端に着くと反転して戻る＝そのまま往復で運ばれる。

const SPEED = 6 // m/s
const X_MIN = -88
const X_MAX = 88
const CENTER_Y = 0.5 // 床の中心 y（天面 ≈ 0.8m。歩いて乗れる低さ）

function Walkway({
  z,
  color,
  startX,
  dir0,
}: {
  z: number
  color: string
  startX: number
  dir0: 1 | -1
}) {
  const ref = useRef<RapierRigidBody>(null)
  const x = useRef(startX)
  const dir = useRef<number>(dir0)

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05) // タブ復帰時の大ジャンプ防止
    x.current += dir.current * SPEED * d
    if (x.current >= X_MAX) {
      x.current = X_MAX
      dir.current = -1
    } else if (x.current <= X_MIN) {
      x.current = X_MIN
      dir.current = 1
    }
    // kinematicPosition は setNextKinematicTranslation で動かす（rapierが速度を算出→ecctrlが運ぶ）
    ref.current?.setNextKinematicTranslation({ x: x.current, y: CENTER_Y, z })
  })

  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders="cuboid" position={[startX, CENTER_Y, z]}>
      {/* 床本体（広めで乗りやすい） */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[5, 0.6, 5]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
      </mesh>
      {/* 縞模様の天面（動いてるのが分かりやすい・当たり判定なし＝床のcuboidは本体のみ） */}
      {[-1.6, -0.8, 0, 0.8, 1.6].map((sx) => (
        <mesh key={sx} position={[sx, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.35, 4.6]} />
          <meshStandardMaterial color="#ffffff" opacity={0.5} transparent />
        </mesh>
      ))}
    </RigidBody>
  )
}

export function MovingWalkway() {
  return (
    <>
      {/* 行き：左→右（オレンジ） */}
      <Walkway z={-6} color="#ff9f1c" startX={X_MIN} dir0={1} />
      {/* 帰り：右→左（みずいろ） */}
      <Walkway z={6} color="#29b6f6" startX={X_MAX} dir0={-1} />
    </>
  )
}
