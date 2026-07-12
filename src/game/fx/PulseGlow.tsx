import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '../design/palette'
import type { Vec3 } from '../level'

// 「次はここ」を明滅で知らせる光リング（＋オプションの光柱）。
// 文字なしの視線誘導。脈動は ~0.4Hz（3Hz以下厳守＝光過敏に配慮）。
// スターターパスのビーコンと各エリア入口の誘導がこれを共用する。
export function PulseGlow({
  position,
  color = PALETTE.guide,
  radius = 1.1,
  beam = false,
  speed = 2.4, // rad/s（sin の角速度。2.4 ≈ 0.38Hz）
}: {
  position: Vec3
  color?: string
  radius?: number
  beam?: boolean
  speed?: number
}) {
  const ring = useRef<THREE.Mesh>(null)
  const beamRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * speed) * 0.16
    if (ring.current) {
      ring.current.scale.set(pulse, pulse, 1)
      const m = ring.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.55 + Math.sin(t * speed) * 0.25
    }
    if (beamRef.current) {
      const m = beamRef.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.1 + (Math.sin(t * speed * 0.7) + 1) * 0.05
    }
  })

  const [x, y, z] = position
  return (
    <group position={[x, y, z]}>
      {/* 地面すれすれの光リング */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[radius * 0.7, radius, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {/* やわらかい光柱（とおくからでも見える） */}
      {beam && (
        <mesh ref={beamRef} position={[0, 2.6, 0]}>
          <cylinderGeometry args={[radius * 0.5, radius * 0.8, 5.2, 12, 1, true]} />
          <meshBasicMaterial
            color={PALETTE.guideSoft}
            transparent
            opacity={0.14}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
