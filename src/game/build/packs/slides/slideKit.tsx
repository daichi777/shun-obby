import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BoxCollider, PackItem } from '../../itemTypes'

// ============================================================================
// 🛝 まるっこいトイ・スライダー 共有キット
// 「だんだん登る階段坂 → 屋根つき(スタートゲート)の台 → つるつるの滑走面 →
//  ちいさな着水プール」の直線スライダーを、高さ H と footprint だけ変えて作れる工場。
//  メッシュと collider を “同じ幾何” から生成するので、ズレない・friction指定を間違えない
//  （過去の rapier panic 要因＝friction:undefined を構造的に排除）。
//
//  美学: ぷっくり・面取り・3層カラー（ベース＋アクセント＋白ハイライト）で
//        「同じ世界のかわいいミニチュア」に統一する。
//
// 単位はすべてユニット空間（設置時に PlacementSystem が CELL 倍して実寸へ）。CELL=4 前提。
//   ・登り坂  : CA=0.42rad(約24°) ≤ slopeMaxAngle(0.5) → 歩いて登れる。friction 指定なし。
//   ・上の台  : 水平。friction 指定なし。
//   ・滑走面  : SA=0.66rad(約38°) > slopeMaxAngle → 自動で滑る。friction=0.03 のみ。
//   ・両サイド : 落下防止の低い壁（friction 指定なし）。
//   ・プール床/壁 : 水平/低い壁。friction 指定なし。
//  H を上げるほど登り坂が長くなるので、footprint[0]（長さ）も十分とること。
// ============================================================================

const CA = 0.42 // 登り坂の傾き（歩ける・24°）
const SA = 0.66 // 滑走面の傾き（滑る・38°）
const MG = 0.08 // footprint 端からのマージン
const PLAT_LEN = 0.44 // 上の台の長さ
const POOL_LEN = 0.6 // 着地プールの長さ（footprint 端で自動クランプ）
const TH = 0.05 // collider 半厚
const MTH = 0.12 // 見た目メッシュの厚み（チャンキー）

export interface SlideTowerOpts {
  id: string
  name: string
  emoji: string
  price: number
  footprint: [number, number] // [長さ(x), 奥行(z)]。H に合わせて長さを十分とる
  H: number // 上の台の高さ（ユニット）。CELL=4 なら H=1.0 ≒ 4m
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

// ── かわいい3層カラーを作るための色ヘルパー ─────────────────────────────
const WHITE = new THREE.Color('#ffffff')
const DARK = new THREE.Color('#14121a')
function lighten(hex: string, amt = 0.25): string {
  const c = new THREE.Color(hex)
  c.lerp(WHITE, amt)
  return `#${c.getHexString()}`
}
function darken(hex: string, amt = 0.18): string {
  const c = new THREE.Color(hex)
  c.lerp(DARK, amt)
  return `#${c.getHexString()}`
}

// 幾何を一度だけ計算（メッシュ・collider 共用）。
function computeTower(footprint: [number, number], H: number, lanes: 1 | 2) {
  const [L, D] = footprint
  const x0 = -L / 2 + MG
  const climbRun = H / Math.tan(CA)
  const xClimbTop = x0 + climbRun
  const xPlatStart = xClimbTop
  const xPlatEnd = xClimbTop + PLAT_LEN
  const xPlatC = (xPlatStart + xPlatEnd) / 2
  const slideRun = H / Math.tan(SA)
  const xSlideTop = xPlatEnd
  const xSlideBot = xSlideTop + slideRun
  const xSlideC = (xSlideTop + xSlideBot) / 2
  const xPoolEnd = Math.min(xSlideBot + POOL_LEN, L / 2 - MG)
  const xPoolC = (xSlideBot + xPoolEnd) / 2

  const climbLocalLen = climbRun / Math.cos(CA)
  const slideLocalLen = slideRun / Math.cos(SA)
  const climbC: [number, number] = [(x0 + xClimbTop) / 2, H / 2]

  const halfZ = (D / 2 - MG) * 0.9 // 坂・台・プールの半幅
  const sep = halfZ / 2
  const slideLanes =
    lanes === 2
      ? [
          { z: sep, halfZ: sep * 0.82 },
          { z: -sep, halfZ: sep * 0.82 },
        ]
      : [{ z: 0, halfZ }]

  return {
    L,
    D,
    x0,
    xClimbTop,
    xPlatStart,
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

// collider 箱（メッシュと同じ幾何）。friction は滑走面だけ 0.03、他は指定しない。
// （friction:undefined を作らないこと＝rapier panic 対策。滑走面以外は friction キー自体を持たない）
function towerBoxes(footprint: [number, number], H: number, lanes: 1 | 2): BoxCollider[] {
  const g = computeTower(footprint, H, lanes)
  const cCos = Math.cos(CA)
  const cSin = Math.sin(CA)
  const sCos = Math.cos(SA)
  const sSin = Math.sin(SA)
  const wHY = 0.14 // サイド壁の半高さ

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
      args: [0.05, 0.13, g.halfZ],
      position: [g.xPoolEnd, 0.13, 0],
    },
  ]

  // 登り坂の両サイド低い壁（落下防止）。ramp 法線方向に持ち上げて surface 上に載せる。
  for (const s of [1, -1] as const) {
    boxes.push({
      args: [g.climbLocalLen / 2, wHY, 0.05],
      position: [g.climbC[0] - wHY * cSin, g.climbC[1] + wHY * cCos, s * g.halfZ],
      rotation: [0, 0, CA],
    })
  }

  // 滑走面（急斜面・つるつる）＋ 各レーン両サイドの低い壁（落下防止）。
  for (const ln of g.slideLanes) {
    boxes.push({
      args: [g.slideLocalLen / 2, TH, ln.halfZ],
      position: [g.xSlideC, H / 2, ln.z],
      rotation: [0, 0, -SA],
      friction: 0.03,
    })
    for (const s of [1, -1] as const) {
      boxes.push({
        args: [g.slideLocalLen / 2, wHY, 0.05],
        position: [g.xSlideC + wHY * sSin, H / 2 + wHY * sCos, ln.z + s * ln.halfZ],
        rotation: [0, 0, -SA],
      })
    }
  }

  // プール左右の低い壁
  for (const s of [1, -1] as const) {
    boxes.push({
      args: [(g.xPoolEnd - g.xSlideBot) / 2 + 0.12, 0.13, 0.05],
      position: [(g.xSlideBot + g.xPoolEnd) / 2, 0.13, s * g.halfZ],
    })
  }

  return boxes
}

const RAINBOW = ['#ff5a52', '#ff9f1c', '#ffd60a', '#3ad07a', '#3aa0ff', '#a06bff']

// 見た目（メッシュ）。collider と同じ幾何＋かわいい飾り（階段・スタートゲート・
// 支柱・つるつるの縁・虹の縞・ゆれる水面と浮き輪）。
function makeTowerModel(opts: SlideTowerOpts): FC {
  const { footprint, H, lanes = 1, palette, rainbow } = opts
  const g = computeTower(footprint, H, lanes)

  // 3層カラー（ベース＋アクセント＋白ハイライト）を各パーツに割り当て。
  const cl = palette.climb
  const clDark = darken(cl, 0.14)
  const clStep = lighten(cl, 0.26)
  const plat = palette.platform
  const platTop = lighten(plat, 0.34)
  const wall = palette.wall
  const acc = palette.accent
  const accHi = lighten(acc, 0.24)
  const struct = darken(plat, 0.3)
  const slBase = rainbow ? '#fbfbf5' : palette.slide
  const slGloss = lighten(palette.slide, 0.44)

  const cCos = Math.cos(CA)
  const cSin = Math.sin(CA)
  const sCos = Math.cos(SA)
  const sSin = Math.sin(SA)

  // ramp / slide の局所座標（along=lx, normal=nn）→ ワールド座標
  const onRamp = (lx: number, nn: number, z: number): [number, number, number] => [
    g.climbC[0] + lx * cCos - nn * cSin,
    g.climbC[1] + lx * cSin + nn * cCos,
    z,
  ]
  const onSlide = (lx: number, nn: number, z: number): [number, number, number] => [
    g.xSlideC + lx * sCos + nn * sSin,
    H / 2 - lx * sSin + nn * sCos,
    z,
  ]

  const climbW = g.halfZ * 2
  const NSTEP = 5
  const treadLen = g.climbLocalLen / NSTEP
  const stripeLen = g.slideLocalLen / RAINBOW.length
  const gateH = 0.5

  const TowerModel: FC = () => {
    const water = useRef<THREE.Mesh>(null)
    const ring = useRef<THREE.Mesh>(null)
    useFrame((state) => {
      const t = state.clock.elapsedTime
      const w = water.current
      if (w) {
        w.position.y = 0.075 + Math.sin(t * 2.1) * 0.012
        const s = 1 + Math.sin(t * 1.6) * 0.02
        w.scale.set(s, 1, s)
      }
      const r = ring.current
      if (r) {
        r.position.y = 0.12 + Math.sin(t * 1.9 + 1) * 0.02
        r.rotation.z = Math.sin(t * 0.7) * 0.25
      }
    })

    return (
      <group>
        {/* ============ 支柱（地面まで・チャンキー） ============ */}
        {[
          [g.xPlatC, H],
          [g.xSlideC, H / 2],
        ].flatMap(([px, ph]) =>
          [1, -1].map((s) => (
            <mesh key={`pil${px}${s}`} castShadow position={[px, ph / 2, s * (g.halfZ * 0.72)]}>
              <cylinderGeometry args={[0.07, 0.08, ph, 10]} />
              <meshStandardMaterial color={struct} roughness={0.7} />
            </mesh>
          )),
        )}

        {/* ============ 登り階段（歩ける坂＋段差の見た目） ============ */}
        {/* 坂の土台スラブ */}
        <mesh castShadow receiveShadow position={onRamp(0, 0, 0)} rotation={[0, 0, CA]}>
          <boxGeometry args={[g.climbLocalLen, MTH, climbW]} />
          <meshStandardMaterial color={clDark} roughness={0.8} />
        </mesh>
        {/* 段板（交互色でだんだんに見せる） */}
        {Array.from({ length: NSTEP }, (_, i) => {
          const lx = -g.climbLocalLen / 2 + treadLen * (i + 0.5)
          return (
            <mesh
              key={`tr${i}`}
              castShadow
              position={onRamp(lx, MTH / 2 + 0.018, 0)}
              rotation={[0, 0, CA]}
            >
              <boxGeometry args={[treadLen * 0.9, 0.04, climbW * 0.92]} />
              <meshStandardMaterial color={i % 2 === 0 ? cl : clStep} roughness={0.72} />
            </mesh>
          )
        })}
        {/* 坂の両サイドの手すりカーブ（低い壁） */}
        {[1, -1].map((s) => (
          <mesh
            key={`cg${s}`}
            castShadow
            position={onRamp(0, MTH / 2 + 0.1, s * g.halfZ)}
            rotation={[0, 0, CA]}
          >
            <boxGeometry args={[g.climbLocalLen, 0.2, 0.06]} />
            <meshStandardMaterial color={wall} roughness={0.6} />
          </mesh>
        ))}

        {/* ============ 上の台 ============ */}
        <mesh castShadow receiveShadow position={[g.xPlatC, H, 0]}>
          <boxGeometry args={[PLAT_LEN + 0.14, MTH, climbW]} />
          <meshStandardMaterial color={plat} roughness={0.7} />
        </mesh>
        {/* 台の上のつるっとした天板 */}
        <mesh position={[g.xPlatC, H + MTH / 2 + 0.006, 0]}>
          <boxGeometry args={[PLAT_LEN + 0.02, 0.012, climbW * 0.9]} />
          <meshStandardMaterial color={platTop} roughness={0.35} />
        </mesh>

        {/* ============ スタートゲート（屋根がわりの門） ============ */}
        {[1, -1].map((s) => (
          <mesh key={`gp${s}`} castShadow position={[g.xPlatEnd - 0.03, H + gateH / 2, s * g.halfZ * 0.82]}>
            <cylinderGeometry args={[0.045, 0.045, gateH, 8]} />
            <meshStandardMaterial color={wall} roughness={0.55} />
          </mesh>
        ))}
        <mesh castShadow position={[g.xPlatEnd - 0.03, H + gateH, 0]}>
          <boxGeometry args={[0.08, 0.08, g.halfZ * 1.72]} />
          <meshStandardMaterial color={acc} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[g.xPlatEnd - 0.03, H + gateH + 0.06, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={accHi} roughness={0.4} />
        </mesh>

        {/* ============ 滑走面（レーンぶん） ============ */}
        {g.slideLanes.map((ln, li) => {
          const laneColor = lanes === 2 && li === 1 ? lighten(palette.slide, 0.22) : slBase
          const laneW = ln.halfZ * 2
          return (
            <group key={`ln${li}`}>
              {/* すべり台の面 */}
              <mesh castShadow receiveShadow position={[g.xSlideC, H / 2, ln.z]} rotation={[0, 0, -SA]}>
                <boxGeometry args={[g.slideLocalLen, MTH, laneW]} />
                <meshStandardMaterial color={laneColor} roughness={0.42} />
              </mesh>
              {/* 虹の縞 or つるっとしたセンターハイライト（見た目だけ） */}
              {rainbow ? (
                RAINBOW.map((c, i) => {
                  const lx = -g.slideLocalLen / 2 + stripeLen * (i + 0.5)
                  return (
                    <mesh key={`rb${i}`} position={onSlide(lx, MTH / 2 + 0.008, ln.z)} rotation={[0, 0, -SA]}>
                      <boxGeometry args={[stripeLen * 0.94, 0.014, laneW * 0.9]} />
                      <meshStandardMaterial color={c} roughness={0.4} />
                    </mesh>
                  )
                })
              ) : (
                <mesh position={onSlide(0, MTH / 2 + 0.006, ln.z)} rotation={[0, 0, -SA]}>
                  <boxGeometry args={[g.slideLocalLen * 0.98, 0.012, laneW * 0.46]} />
                  <meshStandardMaterial color={slGloss} roughness={0.25} />
                </mesh>
              )}
              {/* 両サイドの縁（低い壁）＋ まるい上ぶち */}
              {[1, -1].map((s) => (
                <group key={`sw${s}`}>
                  <mesh castShadow position={onSlide(0, MTH / 2 + 0.11, ln.z + s * ln.halfZ)} rotation={[0, 0, -SA]}>
                    <boxGeometry args={[g.slideLocalLen, 0.22, 0.06]} />
                    <meshStandardMaterial color={wall} roughness={0.55} />
                  </mesh>
                  <mesh position={onSlide(0, MTH / 2 + 0.22, ln.z + s * ln.halfZ)} rotation={[0, 0, Math.PI / 2 - SA]}>
                    <cylinderGeometry args={[0.035, 0.035, g.slideLocalLen, 8]} />
                    <meshStandardMaterial color={acc} roughness={0.45} />
                  </mesh>
                </group>
              ))}
            </group>
          )
        })}

        {/* ============ 着地プール ============ */}
        {/* 床 */}
        <mesh receiveShadow position={[(g.xSlideBot + g.xPoolEnd) / 2 - 0.06, 0.03, 0]}>
          <boxGeometry args={[g.xPoolEnd - g.xSlideBot + 0.24, MTH, climbW]} />
          <meshStandardMaterial color="#dff1ff" roughness={0.6} />
        </mesh>
        {/* まわりのふち（奥＋左右。-x 側は滑り込み口なので開ける） */}
        <mesh castShadow position={[g.xPoolEnd, 0.15, 0]}>
          <boxGeometry args={[0.06, 0.28, climbW + 0.1]} />
          <meshStandardMaterial color={wall} roughness={0.55} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={`pw${s}`} castShadow position={[(g.xSlideBot + g.xPoolEnd) / 2, 0.15, s * g.halfZ]}>
            <boxGeometry args={[g.xPoolEnd - g.xSlideBot + 0.24, 0.28, 0.06]} />
            <meshStandardMaterial color={wall} roughness={0.55} />
          </mesh>
        ))}
        {/* 水面（ゆらゆら・見た目だけ） */}
        <mesh ref={water} position={[(g.xSlideBot + g.xPoolEnd) / 2 - 0.06, 0.075, 0]}>
          <boxGeometry args={[g.xPoolEnd - g.xSlideBot + 0.14, 0.06, climbW * 0.9]} />
          <meshStandardMaterial
            color="#4cc9f0"
            transparent
            opacity={0.82}
            emissive="#1d7fa6"
            emissiveIntensity={0.25}
            roughness={0.3}
          />
        </mesh>
        {/* 浮き輪（ぷかぷか） */}
        <mesh ref={ring} position={[(g.xSlideBot + g.xPoolEnd) / 2 + 0.1, 0.12, g.halfZ * 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.05, 8, 14]} />
          <meshStandardMaterial color={acc} roughness={0.5} />
        </mesh>
      </group>
    )
  }
  return TowerModel
}

// スライダー1種を作る工場。公開API {id,name,emoji,price,footprint,H,lanes,palette,rainbow} は不変。
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
