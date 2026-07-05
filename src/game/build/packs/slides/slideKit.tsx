import type { FC } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BoxCollider, PackItem } from '../../itemTypes'
import { lighten, darken, GroundShadow } from '../kit'

// ============================================================================
// 🛝 まるっこいトイ・スライダー 共有キット（螺旋階段タイプ）
// 「螺旋階段でコンパクトに登る → 屋根つき(スタートゲート)の高い台 → 急なつるつる
//  滑走面 → ちいさな着水プール」。登りを螺旋にしたので、高さ H を上げても footprint は
//  ほぼ一定＝コンパクトなのに高い所から滑れる。
//  メッシュと collider を “同じ幾何” から生成（friction:undefined を構造的に排除）。
//
// 単位はすべてユニット空間（設置時に PlacementSystem が CELL 倍して実寸へ）。CELL=4 前提。
//   ・螺旋の段 : 中心ポールのまわりを螺旋状に登る箱。1段の上がり ≈0.24(≒1m)＝ジャンプで登れる。friction なし。
//   ・上の台   : 螺旋のてっぺん。水平。friction なし。
//   ・滑走面   : SA=1.05rad(約60°) > slopeMaxAngle(0.5) → 自動で滑る（急で速い）。friction=0.03 のみ。
//   ・両サイド : 落下防止の低い壁（friction なし）。プール床/壁 : 水平/低い壁（friction なし）。
//  高さ H は 1.1〜1.4 くらい（≒4.4〜5.6m）でも [2,1]/[2,2] に収まる。
// ============================================================================

const MG = 0.08 // footprint 端からのマージン
const TOWER_R = 0.3 // 螺旋の半径（中心ポールからの距離）
const PLAT_HX = 0.32 // 上の台の半分の長さ(x)
const STEP_RISE_T = 0.24 // 1段の上がり目安（ジャンプで登れる高さ ≒1m）
const DTHETA = 0.72 // 1段ごとの回転角（rad）
const STEP_HW = 0.19 // 段の半幅（大きめ＝乗りやすい）
const STEP_HD = 0.16 // 段の半奥行き
const STEP_HT = 0.045 // 段の半厚
const SA = 1.05 // 滑走面の傾き（急・約60°。高い台でも短く収まる）
const POOL_LEN = 0.34 // 着地プールの長さ（footprint 端で自動クランプ）
const TH = 0.05 // collider 半厚
const MTH = 0.1 // 見た目メッシュの厚み

export interface SlideTowerOpts {
  id: string
  name: string
  emoji: string
  price: number
  footprint: [number, number] // [長さ(x), 奥行(z)]。螺旋なので [2,1]/[2,2] でOK
  H: number // 上の台の高さ（ユニット）。CELL=4 なら H=1.2 ≒ 4.8m
  lanes?: 1 | 2 // 滑走レーン数（2=ツイン）
  palette: {
    climb: string
    platform: string
    slide: string
    wall: string
    accent: string
  }
  rainbow?: boolean
}

interface Step {
  theta: number
  x: number
  z: number
  topY: number
}

// 幾何を一度だけ計算（メッシュ・collider 共用）。
function computeTower(footprint: [number, number], H: number, lanes: 1 | 2) {
  const [L, D] = footprint
  const x0 = -L / 2 + MG
  const towerCX = x0 + TOWER_R // 螺旋の中心
  const N = Math.max(3, Math.ceil(H / STEP_RISE_T))
  const stepRise = H / N
  // 螺旋の段。てっぺん(i=N-1)を theta=0（＝+x／滑走面側）に向ける。
  const steps: Step[] = Array.from({ length: N }, (_, i) => {
    const theta = (i - (N - 1)) * DTHETA
    return {
      theta,
      x: towerCX + TOWER_R * Math.cos(theta),
      z: TOWER_R * Math.sin(theta),
      topY: (i + 1) * stepRise,
    }
  })

  const halfZ = (D / 2 - MG) * 0.9 // 台・プールの半幅
  const xSlideTop = towerCX + PLAT_HX // 台の +x 端＝滑走面の上端
  const slideRun = H / Math.tan(SA)
  const xSlideBot = xSlideTop + slideRun
  const xSlideC = (xSlideTop + xSlideBot) / 2
  const xPoolEnd = Math.min(xSlideBot + POOL_LEN, L / 2 - MG)
  const slideLocalLen = slideRun / Math.cos(SA)

  const sep = halfZ / 2
  const slideLanes =
    lanes === 2
      ? [
          { z: sep, halfZ: sep * 0.8 },
          { z: -sep, halfZ: sep * 0.8 },
        ]
      : [{ z: 0, halfZ: Math.min(halfZ, 0.3) }]

  return {
    L,
    D,
    x0,
    towerCX,
    steps,
    stepRise,
    halfZ,
    xSlideTop,
    xSlideBot,
    xSlideC,
    xPoolEnd,
    slideLocalLen,
    slideLanes,
  }
}

// collider 箱（メッシュと同じ幾何）。friction は滑走面だけ 0.03、他は指定しない。
function towerBoxes(footprint: [number, number], H: number, lanes: 1 | 2): BoxCollider[] {
  const g = computeTower(footprint, H, lanes)
  const sCos = Math.cos(SA)
  const sSin = Math.sin(SA)
  const wHY = 0.14 // サイド壁の半高さ

  const boxes: BoxCollider[] = []

  // 螺旋の段（ジャンプで登る・乗れる固体。friction なし）
  for (const s of g.steps) {
    boxes.push({
      args: [STEP_HW, STEP_HT, STEP_HD],
      position: [s.x, s.topY - STEP_HT, s.z],
      rotation: [0, s.theta, 0],
    })
  }

  // 上の台（螺旋のてっぺん・水平。天面が H）
  boxes.push({
    args: [PLAT_HX + 0.02, TH, g.halfZ],
    position: [g.towerCX, H - TH, 0],
  })

  // 着地プールの床（滑走面下まで少し重ねる）
  boxes.push({
    args: [(g.xPoolEnd - g.xSlideBot) / 2 + 0.12, TH, g.halfZ],
    position: [(g.xSlideBot + g.xPoolEnd) / 2 - 0.06, 0, 0],
  })
  // プール奥の低い壁
  boxes.push({
    args: [0.05, 0.13, g.halfZ],
    position: [g.xPoolEnd, 0.13, 0],
  })

  // 滑走面（急・つるつる）＋ 各レーン両サイドの低い壁（落下防止）
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

function makeTowerModel(opts: SlideTowerOpts): FC {
  const { footprint, H, lanes = 1, palette, rainbow } = opts
  const g = computeTower(footprint, H, lanes)

  // 3層カラー
  const cl = palette.climb
  const clStep = lighten(cl, 0.24)
  const clDark = darken(cl, 0.16)
  const plat = palette.platform
  const platTop = lighten(plat, 0.34)
  const wall = palette.wall
  const acc = palette.accent
  const accHi = lighten(acc, 0.24)
  const struct = darken(plat, 0.3)
  const slBase = rainbow ? '#fbfbf5' : palette.slide
  const slGloss = lighten(palette.slide, 0.44)

  const sCos = Math.cos(SA)
  const sSin = Math.sin(SA)

  // slide の局所座標（along=lx, normal=nn）→ ワールド座標
  const onSlide = (lx: number, nn: number, z: number): [number, number, number] => [
    g.xSlideC + lx * sCos + nn * sSin,
    H / 2 - lx * sSin + nn * sCos,
    z,
  ]

  const climbW = g.halfZ * 2
  const stripeLen = g.slideLocalLen / RAINBOW.length
  const gateH = 0.42

  const poolCx = (g.xSlideBot + g.xPoolEnd) / 2 - 0.06
  const poolHalfX = (g.xPoolEnd - g.xSlideBot + 0.14) / 2
  const sparkleOffsets: [number, number, number][] = [
    [-poolHalfX * 0.42, 0.14, climbW * 0.24],
    [poolHalfX * 0.3, 0.155, -climbW * 0.26],
    [poolHalfX * 0.46, 0.135, climbW * 0.1],
    [-poolHalfX * 0.12, 0.15, -climbW * 0.12],
  ]

  const TowerModel: FC = () => {
    const water = useRef<THREE.Mesh>(null)
    const ring = useRef<THREE.Mesh>(null)
    const sparkle = useRef<THREE.Group>(null)
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
      const sp = sparkle.current
      if (sp) {
        sp.rotation.y = t * 0.5
        const k = 1 + Math.sin(t * 4.2) * 0.22
        sp.scale.set(k, k, k)
      }
    })

    return (
      <group>
        {/* ============ 接地シャドウ（螺旋の足元・滑走・プールの下） ============ */}
        {[g.towerCX, g.xSlideC, poolCx].map((sx, i) => (
          <group key={`gs${i}`} position={[sx, 0, 0]}>
            <GroundShadow size={Math.min(g.L, g.D) / 2} opacity={0.14} />
          </group>
        ))}

        {/* ============ 螺旋階段 ============ */}
        {/* 中心のポール（地面〜台まで） */}
        <mesh castShadow position={[g.towerCX, H / 2, 0]}>
          <cylinderGeometry args={[0.07, 0.085, H, 12]} />
          <meshStandardMaterial color={struct} roughness={0.7} />
        </mesh>
        {/* 螺旋の段（交互色の2トーン＋つやの天板＋外側の手すり玉） */}
        {g.steps.map((s, i) => (
          <group key={`st${i}`} position={[s.x, 0, s.z]} rotation={[0, s.theta, 0]}>
            {/* 段本体 */}
            <mesh castShadow receiveShadow position={[0, s.topY - STEP_HT, 0]}>
              <boxGeometry args={[STEP_HW * 2, STEP_HT * 2, STEP_HD * 2]} />
              <meshStandardMaterial color={i % 2 === 0 ? cl : clStep} roughness={0.72} />
            </mesh>
            {/* 段の下の影トーン（面取り） */}
            <mesh position={[0, s.topY - STEP_HT * 2.3, 0]}>
              <boxGeometry args={[STEP_HW * 1.8, STEP_HT, STEP_HD * 1.8]} />
              <meshStandardMaterial color={clDark} roughness={0.8} />
            </mesh>
            {/* 外側の手すり玉（落ちない安心の目印・見た目だけ） */}
            <mesh castShadow position={[STEP_HW * 0.9, s.topY + 0.12, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color={acc} roughness={0.5} />
            </mesh>
          </group>
        ))}

        {/* ============ 上の台（螺旋のてっぺん） ============ */}
        <mesh castShadow receiveShadow position={[g.towerCX, H - MTH / 2, 0]}>
          <boxGeometry args={[(PLAT_HX + 0.04) * 2, MTH, climbW]} />
          <meshStandardMaterial color={plat} roughness={0.7} />
        </mesh>
        <mesh position={[g.towerCX, H + 0.008, 0]}>
          <boxGeometry args={[PLAT_HX * 2, 0.012, climbW * 0.9]} />
          <meshStandardMaterial color={platTop} roughness={0.35} />
        </mesh>

        {/* ============ スタートゲート（滑り口の門） ============ */}
        {[1, -1].map((s) => (
          <mesh
            key={`gp${s}`}
            castShadow
            position={[g.xSlideTop - 0.02, H + gateH / 2, s * g.halfZ * 0.82]}
          >
            <cylinderGeometry args={[0.045, 0.045, gateH, 8]} />
            <meshStandardMaterial color={wall} roughness={0.55} />
          </mesh>
        ))}
        <mesh castShadow position={[g.xSlideTop - 0.02, H + gateH, 0]}>
          <boxGeometry args={[0.08, 0.08, g.halfZ * 1.72]} />
          <meshStandardMaterial color={acc} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[g.xSlideTop - 0.02, H + gateH + 0.06, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={accHi} roughness={0.4} />
        </mesh>

        {/* ============ 滑走面（レーンぶん） ============ */}
        {g.slideLanes.map((ln, li) => {
          const laneColor = lanes === 2 && li === 1 ? lighten(palette.slide, 0.22) : slBase
          const laneW = ln.halfZ * 2
          return (
            <group key={`ln${li}`}>
              <mesh castShadow receiveShadow position={[g.xSlideC, H / 2, ln.z]} rotation={[0, 0, -SA]}>
                <boxGeometry args={[g.slideLocalLen, MTH, laneW]} />
                <meshStandardMaterial color={laneColor} roughness={0.42} />
              </mesh>
              {rainbow ? (
                RAINBOW.map((c, i) => {
                  const lx = -g.slideLocalLen / 2 + stripeLen * (i + 0.5)
                  return (
                    <mesh key={`rb${i}`} position={onSlide(lx, MTH / 2 + 0.008, ln.z)} rotation={[0, 0, -SA]}>
                      <boxGeometry args={[stripeLen * 0.94, 0.014, laneW * 0.9]} />
                      <meshStandardMaterial color={c} roughness={0.35} emissive={c} emissiveIntensity={0.16} />
                    </mesh>
                  )
                })
              ) : (
                <mesh position={onSlide(0, MTH / 2 + 0.006, ln.z)} rotation={[0, 0, -SA]}>
                  <boxGeometry args={[g.slideLocalLen * 0.98, 0.012, laneW * 0.46]} />
                  <meshStandardMaterial color={slGloss} roughness={0.22} emissive={slGloss} emissiveIntensity={0.18} />
                </mesh>
              )}
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
        <mesh receiveShadow position={[poolCx, 0.03, 0]}>
          <boxGeometry args={[g.xPoolEnd - g.xSlideBot + 0.24, MTH, climbW]} />
          <meshStandardMaterial color="#dff1ff" roughness={0.6} />
        </mesh>
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
        <mesh ref={water} position={[poolCx, 0.075, 0]}>
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
        <mesh ref={ring} position={[poolCx + 0.16, 0.12, g.halfZ * 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.045, 8, 14]} />
          <meshStandardMaterial color={acc} roughness={0.5} />
        </mesh>
        <group ref={sparkle} position={[poolCx, 0, 0]}>
          {sparkleOffsets.map((p, i) => (
            <mesh key={`spk${i}`} position={p}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#eaffff"
                emissiveIntensity={0.9}
                roughness={0.25}
                transparent
                opacity={0.9}
              />
            </mesh>
          ))}
        </group>
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
