import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider, BallCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { FlowingWater, WaterPool, makeWaterTexture } from './Water'

// 公園風プラザの「かざり」一式。
//   ・中央: 噴水（水アニメ）＋まるい石だたみ広場＋十字の小道
//   ・まわり: 並木・花壇・ベンチ・街灯
//   ・外周: 低いフェンス（見た目）＋見えない壁（おちないように）
//   ・遠くにうすい霧（おくゆき）
// あたり判定（コライダー）は 噴水・ベンチ・木の幹・外周の壁 だけ。
// 木のはっぱ・花・街灯・石だたみは通りぬけOK（子どもが引っかからないように）。

// ---- 共通カラー ----
const STONE = '#cfc7b8'
const STONE_DARK = '#b8af9d'
const SOIL = '#6b4a2b'

// ============================================================
// 噴水（中央）— 水がぴょこぴょこ上下するアニメつき
// ============================================================
function Fountain() {
  const dropsRef = useRef<THREE.Group>(null)
  const surfRef = useRef<THREE.Mesh>(null)
  // 水面に「流れる水もよう」をのせる（中央からうずまくように見せる）
  const surfTex = useMemo(() => {
    const tex = makeWaterTexture('#52c7f0', '#bff0ff')
    tex.repeat.set(2, 2)
    return tex
  }, [])
  useEffect(() => () => surfTex.dispose(), [surfTex])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    // しぶき（小さな水のたま）が、ずれた位相で上下にはねる
    const g = dropsRef.current
    if (g) {
      g.children.forEach((c, i) => {
        const phase = t * 2.4 + i * 1.3
        c.position.y = 1.55 + Math.abs(Math.sin(phase)) * 0.6
        const s = 0.7 + Math.abs(Math.cos(phase)) * 0.5
        c.scale.setScalar(s)
      })
    }
    // 水面がほんのり波うつ（スケールをわずかに）＋もようがゆっくり流れる
    if (surfRef.current) {
      const s = 1 + Math.sin(t * 1.6) * 0.02
      surfRef.current.scale.set(s, 1, s)
    }
    surfTex.offset.x += 0.04 * delta
    surfTex.offset.y += 0.05 * delta
  })

  return (
    <group position={[0, 0, 0]}>
      {/* 外側のふち（石）＝あたり判定つき（中に入れない） */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.5, 2.4]} position={[0, 0.5, 0]} />
      </RigidBody>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <cylinderGeometry args={[2.4, 2.6, 0.9, 28]} />
        <meshStandardMaterial color={STONE} />
      </mesh>
      {/* 水面（うすい青・すこし透ける・もようが流れる） */}
      <mesh ref={surfRef} position={[0, 0.82, 0]}>
        <cylinderGeometry args={[2.15, 2.15, 0.12, 28]} />
        <meshStandardMaterial
          map={surfTex}
          color="#52c7f0"
          transparent
          opacity={0.85}
          emissive="#52c7f0"
          emissiveIntensity={0.15}
          metalness={0.1}
          roughness={0.15}
        />
      </mesh>
      {/* 中央の台＋上のお皿 */}
      <mesh castShadow position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 1.4, 16]} />
        <meshStandardMaterial color={STONE_DARK} />
      </mesh>
      <mesh castShadow position={[0, 1.95, 0]}>
        <cylinderGeometry args={[0.85, 0.5, 0.22, 20]} />
        <meshStandardMaterial color={STONE} />
      </mesh>
      {/* 上から落ちる水のたま（アニメ） */}
      <group ref={dropsRef}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.55, 1.6, Math.sin(a) * 0.55]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial
                color="#bfeaff"
                transparent
                opacity={0.85}
                roughness={0.1}
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

// ============================================================
// 石だたみの広場（中央のまるい床）＋十字の小道
// 地面とほぼツライチ（ちょっとだけ上）。あたり判定なし（地面の上を歩く）。
// ============================================================
function PlazaFloor() {
  return (
    <group>
      {/* 中央のまるい広場 */}
      <mesh receiveShadow position={[0, 0.0, 0]}>
        <cylinderGeometry args={[9, 9, 0.06, 48]} />
        <meshStandardMaterial color={STONE} />
      </mesh>
      {/* ふちのリング（すこし濃い石） */}
      <mesh receiveShadow position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[9, 0.35, 8, 48]} />
        <meshStandardMaterial color={STONE_DARK} />
      </mesh>
      {/* 十字の小道（東西・南北） */}
      <mesh receiveShadow position={[20, 0.0, 0]}>
        <boxGeometry args={[24, 0.06, 4]} />
        <meshStandardMaterial color={STONE_DARK} />
      </mesh>
      <mesh receiveShadow position={[-20, 0.0, 0]}>
        <boxGeometry args={[24, 0.06, 4]} />
        <meshStandardMaterial color={STONE_DARK} />
      </mesh>
      <mesh receiveShadow position={[0, 0.0, 20]}>
        <boxGeometry args={[4, 0.06, 24]} />
        <meshStandardMaterial color={STONE_DARK} />
      </mesh>
      <mesh receiveShadow position={[0, 0.0, -20]}>
        <boxGeometry args={[4, 0.06, 24]} />
        <meshStandardMaterial color={STONE_DARK} />
      </mesh>
    </group>
  )
}

// ============================================================
// 公園の木（大きめ）— 幹に小さなあたり判定。はっぱは通りぬけOK。
// ============================================================
function ParkTree({ position, rotation = 0, tint = '#43c14a' }: { position: [number, number]; rotation?: number; tint?: string }) {
  const [x, z] = position
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {/* 幹のあたり判定（小さめの玉）— ぶつかるけど引っかかりにくい */}
      <RigidBody type="fixed" colliders={false}>
        <BallCollider args={[0.5]} position={[0, 0.7, 0]} />
      </RigidBody>
      {/* 幹 */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 1.4, 10]} />
        <meshStandardMaterial color="#9c5a2c" />
      </mesh>
      {/* もこもこの葉 3つ */}
      <mesh castShadow position={[0, 1.75, 0]}>
        <sphereGeometry args={[1.05, 16, 16]} />
        <meshStandardMaterial color={tint} />
      </mesh>
      <mesh castShadow position={[0.55, 1.55, 0.35]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial color={tint} />
      </mesh>
      <mesh castShadow position={[-0.45, 1.6, -0.35]}>
        <sphereGeometry args={[0.62, 16, 16]} />
        <meshStandardMaterial color={tint} />
      </mesh>
      <mesh castShadow position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial color="#5ad860" />
      </mesh>
    </group>
  )
}

// ============================================================
// ベンチ（木）— かんたんなあたり判定つき。中央を向いて置く。
// ============================================================
function Bench({ position }: { position: [number, number] }) {
  const [x, z] = position
  // 中央（原点）のほうを向く
  const rotY = Math.atan2(-x, -z)
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.8, 0.45, 0.3]} position={[0, 0.45, 0]} />
      </RigidBody>
      {/* すわる面 */}
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.5, 0.1, 0.5]} />
        <meshStandardMaterial color="#a9712f" />
      </mesh>
      {/* せもたれ */}
      <mesh castShadow position={[0, 0.78, -0.22]}>
        <boxGeometry args={[1.5, 0.5, 0.08]} />
        <meshStandardMaterial color="#a9712f" />
      </mesh>
      {/* あし4本 */}
      {([[-0.65, 0.2], [0.65, 0.2], [-0.65, -0.2], [0.65, -0.2]] as const).map(([lx, lz], i) => (
        <mesh key={i} castShadow position={[lx, 0.2, lz]}>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
          <meshStandardMaterial color="#7a5223" />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================
// 街灯（見た目だけ・光る玉）。実ライトは置かず emissive で軽く。
// ============================================================
function LampPost({ position }: { position: [number, number] }) {
  const [x, z] = position
  return (
    <group position={[x, 0, z]}>
      {/* ポール */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 3, 10]} />
        <meshStandardMaterial color="#3a4250" />
      </mesh>
      {/* 土台 */}
      <mesh castShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.2, 12]} />
        <meshStandardMaterial color="#2c333d" />
      </mesh>
      {/* 光る玉 */}
      <mesh position={[0, 3.15, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#fff2b0" emissive="#ffd24a" emissiveIntensity={1.4} />
      </mesh>
      {/* かさ */}
      <mesh castShadow position={[0, 3.45, 0]}>
        <coneGeometry args={[0.3, 0.22, 12]} />
        <meshStandardMaterial color="#2c333d" />
      </mesh>
    </group>
  )
}

// ============================================================
// 花壇（土＋色とりどりの花）。あたり判定なし。
// ============================================================
function FlowerBed({ position, colors }: { position: [number, number]; colors: string[] }) {
  const [x, z] = position
  const spots: [number, number][] = [
    [0, 0],
    [0.35, 0.2],
    [-0.35, 0.2],
    [0.25, -0.3],
    [-0.25, -0.3],
  ]
  return (
    <group position={[x, 0, z]}>
      {/* 土のまる */}
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.14, 16]} />
        <meshStandardMaterial color={SOIL} />
      </mesh>
      {spots.map(([fx, fz], i) => (
        <group key={i} position={[fx, 0.12, fz]}>
          {/* くき */}
          <mesh castShadow position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.36, 6]} />
            <meshStandardMaterial color="#3fae57" />
          </mesh>
          {/* 花 */}
          <mesh castShadow position={[0, 0.4, 0]} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color={colors[i % colors.length]} />
          </mesh>
          <mesh position={[0, 0.43, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#ffd83a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ============================================================
// 外周フェンス（見た目）＋見えない壁（おちないように）
// マップは ±100。フェンスは ±96、壁は ±98。
// ============================================================
function Perimeter() {
  const B = 96 // フェンスの位置
  const W = 98 // 見えない壁
  const sides: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, 0.5, B], size: [2 * B, 1, 0.2] },
    { pos: [0, 0.5, -B], size: [2 * B, 1, 0.2] },
    { pos: [B, 0.5, 0], size: [0.2, 1, 2 * B] },
    { pos: [-B, 0.5, 0], size: [0.2, 1, 2 * B] },
  ]
  return (
    <group>
      {/* 見えない壁（高さ6・4めん） */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W, 3, 0.5]} position={[0, 3, W]} />
        <CuboidCollider args={[W, 3, 0.5]} position={[0, 3, -W]} />
        <CuboidCollider args={[0.5, 3, W]} position={[W, 3, 0]} />
        <CuboidCollider args={[0.5, 3, W]} position={[-W, 3, 0]} />
      </RigidBody>
      {/* 見た目の低いフェンス（横レール） */}
      {sides.map((s, i) => (
        <mesh key={i} castShadow position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color="#e7ecf2" />
        </mesh>
      ))}
      {/* よっかどの柱 */}
      {([[B, B], [B, -B], [-B, B], [-B, -B]] as const).map(([cx, cz], i) => (
        <mesh key={`c${i}`} castShadow position={[cx, 0.7, cz]}>
          <boxGeometry args={[0.4, 1.4, 0.4]} />
          <meshStandardMaterial color="#d3dae3" />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================
// 霧（おくゆき）— scene.fog を命令的にセット（App.tsx をいじらない）
// ============================================================
function FogSetup() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const prev = scene.fog
    // 広いマップ全体が見えるよう、霧はずっと遠くから（うすく奥行きだけ出す）
    scene.fog = new THREE.Fog('#bfe6ff', 130, 520)
    return () => {
      scene.fog = prev
    }
  }, [scene])
  return null
}

// ============================================================
// 流れる水（小川＋浅いプール）— 見た目だけ（あたり判定なし）
//   ・明るいシアン #4cc9f0。CanvasTexture の UV スクロールで「流れる」。
//   ・噴水(中央)・並木・ベンチ・花壇・NEの obby・W/SW のおみせ区画を
//     さけて、北・北西のひらけた芝生に置く。
// ============================================================
function WaterFeatures() {
  return (
    <group>
      {/* 浅いまるいプール（北西のひらけた芝生）。ゆらゆら波うつ */}
      <WaterPool position={[-22, 0.1, 22]} radius={4.5} />

      {/* 小川①：プールの近くを north→west へながれる帯 */}
      <FlowingWater
        position={[-11, 0.09, 26]}
        size={[2.4, 16]}
        rotationY={1.15}
        flow={[0.015, 0.18]}
        repeat={[1, 5]}
      />

      {/* 小川②：南東のひらけた芝生をななめにながれる帯 */}
      <FlowingWater
        position={[24, 0.09, -22]}
        size={[2.6, 18]}
        rotationY={-0.7}
        flow={[0.02, 0.15]}
        repeat={[1, 6]}
      />
    </group>
  )
}

// ---- 配置データ ----
// 円周上に少しばらして木を並べるヘルパー（広いマップを並木で埋める）
const TREE_TINTS = ['#43c14a', '#4cc756', '#3fb84a', '#52cf5c']
const treeRing = (
  r: number,
  n: number,
  phase: number,
): { pos: [number, number]; rot: number; tint: string }[] =>
  Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2
    const jx = i % 2 === 0 ? 4 : -3
    const jz = i % 3 === 0 ? 3 : -2
    return {
      pos: [Math.cos(a) * r + jx, Math.sin(a) * r + jz] as [number, number],
      rot: (i * 0.7) % (Math.PI * 2),
      tint: TREE_TINTS[i % TREE_TINTS.length],
    }
  })

const TREES: { pos: [number, number]; rot: number; tint: string }[] = [
  // 小道のわき（広場の近く）
  { pos: [13, 4], rot: 0.4, tint: '#4cc756' },
  { pos: [13, -4], rot: 1.3, tint: '#43c14a' },
  { pos: [-13, 4], rot: 2.1, tint: '#4cc756' },
  { pos: [-13, -4], rot: 0.8, tint: '#43c14a' },
  { pos: [4, 13], rot: 1.7, tint: '#4cc756' },
  { pos: [-4, 13], rot: 0.2, tint: '#43c14a' },
  { pos: [4, -13], rot: 2.5, tint: '#4cc756' },
  { pos: [-4, -13], rot: 1.0, tint: '#43c14a' },
  // 中間リング（広いマップの中ほどを埋める）
  ...treeRing(46, 9, 0.25),
  ...treeRing(68, 11, 0.62),
  // 外周リング（マップのふちを並木でかこむ）
  ...treeRing(90, 14, 0.1),
]

const LAMPS: [number, number][] = [
  [10, 2.6], [10, -2.6],
  [-10, 2.6], [-10, -2.6],
  [2.6, 10], [-2.6, 10],
  [2.6, -10], [-2.6, -10],
]

const BENCHES: [number, number][] = [
  [3.9, 3.9], [-3.9, 3.9], [3.9, -3.9], [-3.9, -3.9],
]

const FLOWER_COLORS = ['#ff5fb0', '#ffd83a', '#ff7a59', '#a06bff', '#ff4d6d', '#5ad1ff']
const FLOWER_BEDS: [number, number][] = [
  [6.3, 6.3], [-6.3, 6.3], [6.3, -6.3], [-6.3, -6.3],
  [-16, -14], [-22, 6],
]

export function Environment() {
  return (
    <group>
      <FogSetup />
      <PlazaFloor />
      <Fountain />
      <WaterFeatures />
      <Perimeter />
      {TREES.map((t, i) => (
        <ParkTree key={`tree-${i}`} position={t.pos} rotation={t.rot} tint={t.tint} />
      ))}
      {LAMPS.map((p, i) => (
        <LampPost key={`lamp-${i}`} position={p} />
      ))}
      {BENCHES.map((p, i) => (
        <Bench key={`bench-${i}`} position={p} />
      ))}
      {FLOWER_BEDS.map((p, i) => (
        <FlowerBed key={`bed-${i}`} position={p} colors={FLOWER_COLORS} />
      ))}
    </group>
  )
}
