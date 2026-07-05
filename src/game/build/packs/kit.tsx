import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ============================================================================
// 設置アイテム共通の「質感底上げ」キット。全パックがこれを使うことで、
// 2トーン陰影・接地シャドウ・アイドル揺れの流儀を全アイテムで統一する。
// すべてユニット空間（設置時に PlacementSystem が ×CELL する）。
// ============================================================================

const WHITE = new THREE.Color('#ffffff')
const DARK = new THREE.Color('#14121a')

// 色を白/闇へ寄せる（2トーン陰影づくり用）。上面は lighten、根元/くぼみは darken。
export function lighten(hex: string, amt = 0.18): string {
  const c = new THREE.Color(hex)
  c.lerp(WHITE, amt)
  return `#${c.getHexString()}`
}
export function darken(hex: string, amt = 0.16): string {
  const c = new THREE.Color(hex)
  c.lerp(DARK, amt)
  return `#${c.getHexString()}`
}

// 接地感を出すやわらかい影の円盤（原点・地面すれすれ）。
// size は footprint の半分くらい（[1,1]→0.5, [2,2]→1.0）。すり抜けOK・当たり判定なし。
export function GroundShadow({ size = 0.5, opacity = 0.2 }: { size?: number; opacity?: number }) {
  return (
    <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[size, 22]} />
      <meshBasicMaterial color="#141a16" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

// 中身をやさしく揺らす（そよ風=sway / ふるふる上下=bob / 呼吸=breathe）。
// 原点(底面 y=0)まわりに効くので、幹/茎を支点に上がしなる。amp は控えめに。
// phase をアイテム種ごとに変えると、種どうしの揺れがずれて機械っぽさが減る。
export function Sway({
  amp = 0.05,
  speed = 1.2,
  phase = 0,
  mode = 'sway',
  children,
}: {
  amp?: number
  speed?: number
  phase?: number
  mode?: 'sway' | 'bob' | 'breathe'
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const t = state.clock.elapsedTime * speed + phase
    if (mode === 'sway') {
      g.rotation.z = Math.sin(t) * amp
    } else if (mode === 'bob') {
      g.position.y = Math.sin(t) * amp
    } else {
      const s = 1 + Math.sin(t) * amp
      g.scale.set(1, s, 1)
    }
  })
  return <group ref={ref}>{children}</group>
}
