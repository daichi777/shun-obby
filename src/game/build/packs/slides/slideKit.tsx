import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BoxCollider, PackItem } from '../../itemTypes'

// ============================================================================
// 🛝 高い塔型スライダー 共有キット
// 「歩いて登る長い坂 → 高い台 → 急な滑走面 → 着地プール」の直線スライダーを、
//  高さ H と footprint だけ変えて作れる工場。メッシュと collider を “同じ幾何” から
//  生成するので、ズレない・friction指定を間違えない（過去のpanic要因を構造的に排除）。
//
// 単位はすべてユニット空間（設置時に PlacementSystem が CELL=10 倍して実寸へ）。
//   ・登り坂  : ca=0.40rad(約23°) ≤ slopeMaxAngle(0.5) → 歩いて登れる。friction 指定なし。
//   ・上の台  : 水平。friction 指定なし。
//   ・滑走面  : sa=0.64rad(約37°) > slopeMaxAngle → 自動で滑る。friction=0.03 のみ。
//   ・プール床/壁 : 水平/低い壁。friction 指定なし。
//  H を上げるほど登り坂が長くなるので、footprint[0]（長さ）も合わせて広げること。
// ============================================================================

const CA = 0.4 // 登り坂の傾き（歩ける）
const SA = 0.64 // 滑走面の傾き（滑る）
const MG = 0.08 // footprint 端からのマージン
const PLAT_LEN = 0.34 // 上の台の長さ
const POOL_LEN = 0.6 // 着地プールの長さ
const TH = 0.05 // collider 半厚
const MTH = 0.1 // 見た目メッシュの厚み

export interface SlideTowerOpts {
  id: string
  name: string
  emoji: string
  price: number
  footprint: [number, number] // [長さ(x), 奥行(z)]。H に合わせて長さを十分とる
  H: number // 上の台の高さ（ユニット）。例: 0.8 = 8m
  lanes?: 1 | 2 // 滑走レーン数（2=ツイン）
  palette: {
    climb: string
    platform: string
    slide: string // lanes=2 のときも基準色（レーンBは少し明るく）
    wall: string
    accent: string
  }
  rainbow?: boolean // 滑走面を虹色の縞にする
}

// 幾何を一度だけ計算（メッシュ・collider 共用）。
function computeTower(footprint: [number, number], H: number, lanes: 1 | 2) {
  const [L, D] = footprint
  const x0 = -L / 2 + MG
  const climbRun = H / Math.tan(CA)
  const xClimbTop = x0 + climbRun
  const xPlatC = xClimbTop + PLAT_LEN / 2
  const xPlatEnd = xClimbTop + PLAT_LEN
  const slideRun = H / Math.tan(SA)
  const xSlideTop = xPlatEnd
  const xSlideBot = xSlideTop + slideRun
  const xSlideC = (xSlideTop + xSlideBot) / 2
  const xPoolEnd = Math.min(xSlideBot + POOL_LEN, L / 2 - MG)
  const xPoolC = (xSlideBot + xPoolEnd) / 2

  const climbLocalLen = climbRun / Math.cos(CA)
  const slideLocalLen = slideRun / Math.cos(SA)
  const climbC: [number, number] = [(x0 + xClimbTop) / 2, H / 2]

  const halfZ = (D / 2 - MG) * 0.96 // 坂・台・プールの半幅
  const sep = halfZ / 2
  const slideLanes =
    lanes === 2
      ? [
          { z: sep, halfZ: sep * 0.84 },
          { z: -sep, halfZ: sep * 0.84 },
        ]
      : [{ z: 0, halfZ }]

  return {
    L,
    D,
    x0,
    xClimbTop,
    xPlatC,
    xPlatEnd,
    xSlideTop,
    xSlideBot,
    xSlideC,
    xPoolC,
    xPoolEnd,
    climbLocalLen,
    slideLocalLen,
    climbC,
    halfZ,
    slideLanes,
  }
}

// collider 箱（メッシュと同じ幾何）。friction は滑走面だけ 0.03。
function towerBoxes(footprint: [number, number], H: number, lanes: 1 | 2): BoxCollider[] {
  const g = computeTower(footprint, H, lanes)
  const boxes: BoxCollider[] = [
    // 登り坂（歩ける・通常摩擦）
    {
      args: [g.climbLocalLen / 2, TH, g.halfZ],
      position: [g.climbC[0], g.climbC[1], 0],
      rotation: [0, 0, CA],
    },
    // 上の台（水平・両端を少し重ねて隙間なし）
    {
      args: [PLAT_LEN / 2 + 0.08, TH, g.halfZ],
      position: [g.xPlatC, H, 0],
    },
    // 着地プールの床（滑走面下まで少し重ねる）
    {
      args: [(g.xPoolEnd - g.xSlideBot) / 2 + 0.12, TH, g.halfZ],
      position: [(g.xSlideBot + g.xPoolEnd) / 2 - 0.06, 0, 0],
    },
    // プール奥の低い壁（飛び出し防止）
    {
      args: [0.04, 0.12, g.halfZ],
      position: [g.xPoolEnd, 0.12, 0],
    },
  ]
  // 滑走面（急斜面・つるつる）。レーンぶん。
  for (const ln of g.slideLanes) {
    boxes.push({
      args: [g.slideLocalLen / 2, TH, ln.halfZ],
      position: [g.xSlideC, H / 2, ln.z],
      rotation: [0, 0, -SA],
      friction: 0.03,
    })
  }
  return boxes
}

const RAINBOW = ['#ff3b30', '#ff8f1f', '#ffd60a', '#34c759', '#0a84ff', '#9b59ff']

// 見た目（メッシュ）。collider と同じ幾何＋飾り（手すり・支柱・てっぺん玉・ゆれる水面）。
function makeTowerModel(opts: SlideTowerOpts): FC {
  const { footprint, H, lanes = 1, palette, rainbow } = opts
  const g = computeTower(footprint, H, lanes)

  const TowerModel: FC = () => {
    const water = useRef<THREE.Mesh>(null)
    useFrame((state) => {
      const w = water.current
      if (!w) return
      const t = state.clock.elapsedTime
      w.position.y = 0.07 + Math.sin(t * 2.1) * 0.012
      const s = 1 + Math.sin(t * 1.6) * 0.02
      w.scale.set(s, 1, s)
    })

    const climbW = g.halfZ * 2
    const stripeLen = g.slideLocalLen / RAINBOW.length

    return (
      <group>
        {/* === 登り坂 === */}
        <mesh castShadow receiveShadow position={[g.climbC[0], g.climbC[1], 0]} rotation={[0, 0, CA]}>
          <boxGeometry args={[g.climbLocalLen, MTH, climbW]} />
          <meshStandardMaterial color={palette.climb} />
        </mesh>
        {/* 段差ライン（見た目だけ） */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const p = (i + 0.5) / 8
          const lx = -g.climbLocalLen / 2 + g.climbLocalLen * p
          return (
            <mesh
              key={`st${i}`}
              position={[g.climbC[0] + lx * Math.cos(CA), g.climbC[1] + lx * Math.sin(CA), 0]}
              rotation={[0, 0, CA]}
            >
              <boxGeometry args={[0.03, MTH + 0.04, climbW]} />
              <meshStandardMaterial color={palette.accent} />
            </mesh>
          )
        })}
        {/* 登りの横ガード（見た目だけ） */}
        {[g.halfZ, -g.halfZ].map((z) => (
          <mesh key={`cg${z}`} castShadow position={[g.climbC[0], g.climbC[1] + 0.12, z]} rotation={[0, 0, CA]}>
            <boxGeometry args={[g.climbLocalLen, 0.16, 0.04]} />
            <meshStandardMaterial color={palette.wall} />
          </mesh>
        ))}

        {/* === 上の台 === */}
        <mesh castShadow receiveShadow position={[g.xPlatC, H, 0]}>
          <boxGeometry args={[PLAT_LEN + 0.16, MTH, climbW]} />
          <meshStandardMaterial color={palette.platform} />
        </mesh>
        {/* うしろのガード＋てっぺんの玉 */}
        <mesh castShadow position={[g.xPlatC - PLAT_LEN / 2 - 0.04, H + 0.16, 0]}>
          <boxGeometry args={[0.05, 0.3, climbW]} />
          <meshStandardMaterial color={palette.wall} />
        </mesh>
        <mesh castShadow position={[g.xPlatC - PLAT_LEN / 2 - 0.04, H + 0.36, 0]}>
          <sphereGeometry args={[0.08, 14, 14]} />
          <meshStandardMaterial color={palette.accent} />
        </mesh>
        {/* 台＆滑走面を支える支柱（見た目だけ・地面まで） */}
        {[g.halfZ * 0.8, -g.halfZ * 0.8].map((z) => (
          <group key={`pil${z}`}>
            <mesh castShadow position={[g.xPlatC, H / 2, z]}>
              <boxGeometry args={[0.1, H, 0.1]} />
              <meshStandardMaterial color="#8d6e63" />
            </mesh>
            <mesh castShadow position={[g.xSlideC, H / 4, z]}>
              <boxGeometry args={[0.09, H / 2, 0.09]} />
              <meshStandardMaterial color="#8d6e63" />
            </mesh>
          </group>
        ))}

        {/* === 滑走面（レーンぶん） === */}
        {g.slideLanes.map((ln, li) => {
          const laneColor = lanes === 2 && li === 1 ? lighten(palette.slide) : palette.slide
          const laneW = ln.halfZ * 2
          return (
            <group key={`ln${li}`}>
              {/* 土台（虹なら白、ふつうはレーン色） */}
              <mesh
                castShadow
                receiveShadow
                position={[g.xSlideC, H / 2, ln.z]}
                rotation={[0, 0, -SA]}
              >
                <boxGeometry args={[g.slideLocalLen, MTH, laneW]} />
                <meshStandardMaterial color={rainbow ? '#f5f5f5' : laneColor} />
              </mesh>
              {/* 虹の縞（見た目だけ） */}
              {rainbow && (
                <group position={[g.xSlideC, H / 2, ln.z]} rotation={[0, 0, -SA]}>
                  {RAINBOW.map((c, i) => {
                    const lx = -g.slideLocalLen / 2 + stripeLen * (i + 0.5)
                    return (
                      <mesh key={`rb${i}`} position={[lx, MTH / 2 + 0.006, 0]}>
                        <boxGeometry args={[stripeLen * 0.96, 0.012, laneW * 0.92]} />
                        <meshStandardMaterial color={c} />
                      </mesh>
                    )
                  })}
                </group>
              )}
              {/* 滑走の横かべ（見た目だけ） */}
              {[ln.halfZ, -ln.halfZ].map((dz) => (
                <mesh
                  key={`sw${dz}`}
                  castShadow
                  position={[g.xSlideC, H / 2 + 0.1, ln.z + dz]}
                  rotation={[0, 0, -SA]}
                >
                  <boxGeometry args={[g.slideLocalLen, 0.18, 0.04]} />
                  <meshStandardMaterial color={palette.wall} />
                </mesh>
              ))}
            </group>
          )
        })}

        {/* === 着地プール === */}
        {/* 床 */}
        <mesh receiveShadow position={[(g.xSlideBot + g.xPoolEnd) / 2 - 0.06, 0.03, 0]}>
          <boxGeometry args={[g.xPoolEnd - g.xSlideBot + 0.24, MTH, climbW]} />
          <meshStandardMaterial color="#cfe9ff" />
        </mesh>
        {/* 壁（奥＋左右。-x 側は滑り込み口なので開ける・見た目だけ） */}
        <mesh castShadow position={[g.xPoolEnd, 0.16, 0]}>
          <boxGeometry args={[0.05, 0.26, climbW]} />
          <meshStandardMaterial color={palette.wall} />
        </mesh>
        {[g.halfZ, -g.halfZ].map((z) => (
          <mesh key={`pw${z}`} castShadow position={[(g.xSlideBot + g.xPoolEnd) / 2, 0.16, z]}>
            <boxGeometry args={[g.xPoolEnd - g.xSlideBot + 0.24, 0.26, 0.05]} />
            <meshStandardMaterial color={palette.wall} />
          </mesh>
        ))}
        {/* 水面（ゆらゆら・見た目だけ） */}
        <mesh ref={water} position={[(g.xSlideBot + g.xPoolEnd) / 2 - 0.06, 0.08, 0]}>
          <boxGeometry args={[g.xPoolEnd - g.xSlideBot + 0.12, 0.06, climbW * 0.92]} />
          <meshStandardMaterial
            color="#4cc9f0"
            transparent
            opacity={0.82}
            emissive="#1d7fa6"
            emissiveIntensity={0.25}
          />
        </mesh>
      </group>
    )
  }
  return TowerModel
}

// レーンBを少し明るくする簡易ヘルパー
function lighten(hex: string): string {
  try {
    const c = new THREE.Color(hex)
    c.lerp(new THREE.Color('#ffffff'), 0.25)
    return `#${c.getHexString()}`
  } catch {
    return hex
  }
}

// スライダー1種を作る工場。
export function createSlideItem(opts: SlideTowerOpts): PackItem {
  return {
    id: opts.id,
    name: opts.name,
    emoji: opts.emoji,
    price: opts.price,
    footprint: opts.footprint,
    Model: makeTowerModel(opts),
    collider: { boxes: towerBoxes(opts.footprint, opts.H, opts.lanes ?? 1) },
  }
}
