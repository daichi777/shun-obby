import { RigidBody } from '@react-three/rapier'
import { GROUND, PLATFORMS, SLIDE, type Box } from './level'
import { Environment } from './Environment'

function StaticBox({ box }: { box: Box }) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={box.position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={box.size} />
        <meshStandardMaterial color={box.color} />
      </mesh>
    </RigidBody>
  )
}

// コース全体（地面・あしば・大きなスライダー）
export function Course() {
  return (
    <>
      {/* 公園のかざり（噴水・石だたみ・並木・ベンチ・街灯・外周フェンス・霧） */}
      <Environment />

      {/* 地面 */}
      <StaticBox box={GROUND} />

      {/* 階段状のあしば */}
      {PLATFORMS.map((p, i) => (
        <StaticBox key={i} box={p} />
      ))}

      {/* 大きなスライダー（つるつる＝摩擦ひくめ） */}
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={SLIDE.position}
        rotation={[0, 0, SLIDE.rotationZ]}
        friction={0.03}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={SLIDE.size} />
          <meshStandardMaterial color={SLIDE.color} />
        </mesh>
      </RigidBody>
    </>
  )
}
