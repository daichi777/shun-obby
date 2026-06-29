import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFx, type Burst } from './fxStore'

const LIFE = 750 // ms
const COUNT = 12 // 1バーストの粒の数
const SPREAD = 0.0015 // よこ方向のひろがり
const GRAV = 0.0000019 // おちる加速

// 1つのキラキラ（はじけて しぼむ）
function BurstView({ data, onDone }: { data: Burst; onDone: (id: number) => void }) {
  const group = useRef<THREE.Group>(null)
  const dirs = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const a = (i / COUNT) * Math.PI * 2 + Math.random() * 0.6
        const up = 0.8 + Math.random() * 1.1
        const r = 0.7 + Math.random() * 0.6
        return new THREE.Vector3(Math.cos(a) * r, up, Math.sin(a) * r)
      }),
    [],
  )

  useFrame(() => {
    const g = group.current
    if (!g) return
    const age = (typeof performance !== 'undefined' ? performance.now() : 0) - data.born
    const t = age / LIFE
    if (t >= 1) {
      onDone(data.id)
      return
    }
    for (let i = 0; i < g.children.length; i++) {
      const c = g.children[i] as THREE.Mesh
      const d = dirs[i]
      c.position.set(
        d.x * age * SPREAD,
        Math.max(0, d.y * age * SPREAD - GRAV * age * age),
        d.z * age * SPREAD,
      )
      const s = Math.max(0.001, (1 - t) * 0.16)
      c.scale.setScalar(s)
      const m = c.material as THREE.MeshBasicMaterial
      m.opacity = 1 - t
    }
  })

  return (
    <group ref={group} position={data.pos}>
      {Array.from({ length: COUNT }, (_, i) => (
        <mesh key={i}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={data.color}
            transparent
            opacity={1}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// Canvas の中に置く：発火されたキラキラをすべて描画する。
export function Sparkles() {
  const bursts = useFx((s) => s.bursts)
  const remove = useFx((s) => s.remove)
  return (
    <>
      {bursts.map((b) => (
        <BurstView key={b.id} data={b} onDone={remove} />
      ))}
    </>
  )
}
