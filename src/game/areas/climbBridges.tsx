import { RigidBody } from '@react-three/rapier'
import { Coin } from '../Coin'
import type { Vec3 } from '../level'

// =============================================================
// アスレチックエリア：クライミング塔 ＋ 空中つり橋
// 「登って空中の橋を渡る」5歳児向け。
//
// 配置範囲（左下の象限・ワールド絶対座標・スケール1）:
//   x ∈ [-88, -18], z ∈ [18, 88]
// 中央広場 r<15 / 他象限 / フェンス±96 は侵さない。
//
// 当たり判定レシピ厳守:
//   箱メッシュ + fixed RigidBody + auto cuboid。
//   friction はデフォルト（書かない）。1 RigidBody に複数 mesh 可。
// =============================================================

// --- 色（木＋ロープ調） ---
const C_WOOD = '#a9743b' // 明るい木
const C_WOOD_DARK = '#6e4a22' // こげ茶（塔の柱・段差）
const C_PLANK = '#c79a5f' // ベージュ（橋の板）
const C_ROPE = '#5f7d3a' // 緑（手すり/ロープ調）
const C_TOWER_TOP = '#8a5a2c' // 塔のてっぺん（茶）

// 1段の段差: 高さ 0.7m（≤1.0）・奥行 1.0m（≥0.8）→ ジャンプ無しでも登れる
const STEP_H = 0.7
const STEP_D = 1.0
const STEP_W = 3.0 // 段の幅（広めで安心）

// 塔のてっぺんの天板サイズ
const TOP_SIZE = 4.5
const TOP_THICK = 0.6

// つり橋の板
const PLANK_THICK = 0.3 // ≥0.25
const PLANK_W = 2.2 // ≥1.8

// てっぺん中心 y（= 段差を登り切った高さ）
const TOWER_A_TOP_Y = 9.8
const TOWER_B_TOP_Y = 11.2
const TOWER_C_TOP_Y = 10.4

// 塔の中心（x, z）。階段は全塔とも -Z 方向へ降ろす（z 大→小）。
// 最長の階段(16段=16m)でも z=18 を割らないよう、塔本体は z>=70 帯に置く。
// x は十分離して階段同士が重ならないようにする（STEP_W=3 + 余白）。
const TOWER_A: [number, number] = [-80, 80]
const TOWER_B: [number, number] = [-53, 80]
const TOWER_C: [number, number] = [-26, 80]
// 階段を伸ばす向き（全塔 -Z=-1）。
const TOWER_A_DIR = -1
const TOWER_B_DIR = -1
const TOWER_C_DIR = -1

/** 静的な箱メッシュ1枚（RigidBody の中に複数並べて使う）。 */
function BoxMesh({
  position,
  size,
  color,
}: {
  position: Vec3
  size: Vec3
  color: string
}) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

/**
 * クライミング塔。中心 (cx, cz)、てっぺん天板の上面が topY になるように、
 * 段差をらせん状に1辺へ積んで登れるようにする。
 * 段は -Z 側から +Z 方向へ、1段ごとに STEP_H 上がり STEP_D 奥へ進む。
 */
function Tower({
  cx,
  cz,
  topY,
  color,
  stairDir,
}: {
  cx: number
  cz: number
  topY: number
  color: string
  stairDir: number // +1 = +Z 方向へ階段 / -1 = -Z 方向へ階段
}) {
  // 段数: 地面(0)から topY まで STEP_H ずつ
  const steps = Math.max(1, Math.round(topY / STEP_H))
  const stepBlocks: { position: Vec3; size: Vec3 }[] = []

  // 段は塔本体の手前(stairDir 側)の縁から外側へ伸び、内側ほど高い。
  // i=0 が一番外（低い・地面に近い）、i=steps-1 が天板に隣接（高い）。
  const edge = cz + stairDir * (TOP_SIZE / 2) // 天板の stairDir 側の縁
  for (let i = 0; i < steps; i++) {
    const h = STEP_H * (i + 1) // この段の上面の高さ（内側ほど高い）
    // 一番内側(i=steps-1)が縁のすぐ外。外側へ STEP_D ずつ。
    const dFromEdge = (steps - i) * STEP_D - STEP_D / 2
    const z = edge + stairDir * dFromEdge
    stepBlocks.push({
      position: [cx, h / 2, z],
      size: [STEP_W, h, STEP_D],
    })
  }

  // てっぺん天板（上面 = topY）
  const topCenterY = topY - TOP_THICK / 2

  // 塔まるごと1個の fixed RigidBody（中に複数mesh＝レシピ許可）。
  // group は scale しない（scale group 内 RigidBody は禁止）。
  return (
    <RigidBody type="fixed" colliders="cuboid">
      {/* 太い柱（飾り兼支柱） */}
      <BoxMesh
        position={[cx, topY / 2, cz]}
        size={[1.4, topY, 1.4]}
        color={C_WOOD_DARK}
      />
      {/* 登れる段差 */}
      {stepBlocks.map((b, i) => (
        <BoxMesh key={i} position={b.position} size={b.size} color={color} />
      ))}
      {/* てっぺんの広い天板 */}
      <BoxMesh
        position={[cx, topCenterY, cz]}
        size={[TOP_SIZE, TOP_THICK, TOP_SIZE]}
        color={C_TOWER_TOP}
      />
    </RigidBody>
  )
}

/**
 * 2つのてっぺんを空中の板でつなぐ水平つり橋。
 * 隙間 ≤1.0m で板を連続させる。両端は天板に少しかけて隙間ゼロにする。
 * 高低差は緩く（板は両端の平均高さの水平。差 ≤1.5m前提なので段差は小さく安全）。
 */
function Bridge({
  from,
  fromY,
  to,
  toY,
}: {
  from: [number, number]
  fromY: number
  to: [number, number]
  toY: number
}) {
  const [ax, az] = from
  const [bx, bz] = to
  const dx = bx - ax
  const dz = bz - az
  const dist = Math.hypot(dx, dz)
  const angle = Math.atan2(dx, dz) // +Z 基準の回転（板の長辺を +Z に取る）

  // 橋がかかる区間（天板の縁から縁）。少し内側に食い込ませて隙間ゼロに。
  const overlap = TOP_SIZE / 2 - 0.4
  const span = dist - 2 * overlap // 天板内側〜内側の距離
  const ux = dx / dist
  const uz = dz / dist
  // 板を並べる開始点（A 側の天板少し内側）
  const startX = ax + ux * overlap
  const startZ = az + uz * overlap

  // 1枚の板の長さ。span を 6 枚前後に分割（隙間 0.25m を入れても ≤1.0）
  const count = Math.max(2, Math.round(span / 1.7))
  const gap = 0.25
  const plankLen = (span - gap * (count - 1)) / count

  // 板ごとに高さを A→B で線形補間（緩い高低差）
  const planks: { position: Vec3; rotY: number; len: number }[] = []
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count // 区間中央の進行度 0..1
    const cx = startX + ux * (span * t)
    const cz = startZ + uz * (span * t)
    const cy = fromY + (toY - fromY) * t
    planks.push({
      position: [cx, cy - PLANK_THICK / 2, cz],
      rotY: angle,
      len: plankLen,
    })
  }

  // ロープ調の細い手すり（軸並行ではなく橋に沿うので、各板に短い手すりを乗せず、
  // 見た目用に左右1本ずつの細い箱を橋全体に。回転は angle、薄いが本数は2本のみ＝OK）
  const railY = (fromY + toY) / 2 + 0.55
  const railHalf = PLANK_W / 2 + 0.05
  const railCx = (startX + (startX + ux * span)) / 2
  const railCz = (startZ + (startZ + uz * span)) / 2
  // 手すりを橋方向に対して左右へずらすための法線（XZ平面）
  const nx = -uz
  const nz = ux

  // 橋まるごと1個の fixed RigidBody（板＋手すりを複数mesh で内包＝レシピ許可）。
  // この橋は z 一定の水平橋なので回転は ±90°＝軸並行のまま（斜めの薄箱は作らない）。
  return (
    <RigidBody type="fixed" colliders="cuboid">
      {planks.map((p, i) => (
        <mesh
          key={i}
          castShadow
          receiveShadow
          position={p.position}
          rotation={[0, p.rotY, 0]}
        >
          <boxGeometry args={[PLANK_W, PLANK_THICK, p.len]} />
          <meshStandardMaterial color={C_PLANK} />
        </mesh>
      ))}
      {/* 手すり（ロープ調・細い箱2本のみ・軸並行） */}
      {[1, -1].map((side) => (
        <mesh
          key={`rail${side}`}
          castShadow
          position={[
            railCx + nx * railHalf * side,
            railY,
            railCz + nz * railHalf * side,
          ]}
          rotation={[0, angle, 0]}
        >
          <boxGeometry args={[0.1, 0.1, span]} />
          <meshStandardMaterial color={C_ROPE} />
        </mesh>
      ))}
    </RigidBody>
  )
}

export function AreaClimbBridges() {
  return (
    <group>
      {/* --- 3本の塔 --- */}
      <Tower
        cx={TOWER_A[0]}
        cz={TOWER_A[1]}
        topY={TOWER_A_TOP_Y}
        color={C_WOOD}
        stairDir={TOWER_A_DIR}
      />
      <Tower
        cx={TOWER_B[0]}
        cz={TOWER_B[1]}
        topY={TOWER_B_TOP_Y}
        color={C_WOOD}
        stairDir={TOWER_B_DIR}
      />
      <Tower
        cx={TOWER_C[0]}
        cz={TOWER_C[1]}
        topY={TOWER_C_TOP_Y}
        color={C_WOOD}
        stairDir={TOWER_C_DIR}
      />

      {/* --- 空中つり橋（てっぺん同士をつなぐ） --- */}
      <Bridge
        from={TOWER_A}
        fromY={TOWER_A_TOP_Y}
        to={TOWER_B}
        toY={TOWER_B_TOP_Y}
      />
      <Bridge
        from={TOWER_B}
        fromY={TOWER_B_TOP_Y}
        to={TOWER_C}
        toY={TOWER_C_TOP_Y}
      />

      {/* --- コイン（塔のてっぺん・つり橋の上に 10 個） --- */}
      {/* 塔Aのてっぺん */}
      <Coin position={[TOWER_A[0], TOWER_A_TOP_Y + 1.0, TOWER_A[1]]} />
      {/* 塔Bのてっぺん */}
      <Coin position={[TOWER_B[0], TOWER_B_TOP_Y + 1.0, TOWER_B[1]]} />
      {/* 塔Cのてっぺん */}
      <Coin position={[TOWER_C[0], TOWER_C_TOP_Y + 1.0, TOWER_C[1]]} />

      {/* A→B 橋の上（3点） */}
      <Coin
        position={[
          TOWER_A[0] + (TOWER_B[0] - TOWER_A[0]) * 0.3,
          (TOWER_A_TOP_Y + TOWER_B_TOP_Y) / 2 + 1.0,
          TOWER_A[1] + (TOWER_B[1] - TOWER_A[1]) * 0.3,
        ]}
      />
      <Coin
        position={[
          TOWER_A[0] + (TOWER_B[0] - TOWER_A[0]) * 0.5,
          (TOWER_A_TOP_Y + TOWER_B_TOP_Y) / 2 + 1.0,
          TOWER_A[1] + (TOWER_B[1] - TOWER_A[1]) * 0.5,
        ]}
      />
      <Coin
        position={[
          TOWER_A[0] + (TOWER_B[0] - TOWER_A[0]) * 0.7,
          (TOWER_A_TOP_Y + TOWER_B_TOP_Y) / 2 + 1.0,
          TOWER_A[1] + (TOWER_B[1] - TOWER_A[1]) * 0.7,
        ]}
      />

      {/* B→C 橋の上（3点） */}
      <Coin
        position={[
          TOWER_B[0] + (TOWER_C[0] - TOWER_B[0]) * 0.3,
          (TOWER_B_TOP_Y + TOWER_C_TOP_Y) / 2 + 1.0,
          TOWER_B[1] + (TOWER_C[1] - TOWER_B[1]) * 0.3,
        ]}
      />
      <Coin
        position={[
          TOWER_B[0] + (TOWER_C[0] - TOWER_B[0]) * 0.5,
          (TOWER_B_TOP_Y + TOWER_C_TOP_Y) / 2 + 1.0,
          TOWER_B[1] + (TOWER_C[1] - TOWER_B[1]) * 0.5,
        ]}
      />
      <Coin
        position={[
          TOWER_B[0] + (TOWER_C[0] - TOWER_B[0]) * 0.7,
          (TOWER_B_TOP_Y + TOWER_C_TOP_Y) / 2 + 1.0,
          TOWER_B[1] + (TOWER_C[1] - TOWER_B[1]) * 0.7,
        ]}
      />

      {/* 階段の途中（塔Aの登り口・+Z 側）にもう1個＝合計10個 */}
      <Coin
        position={[
          TOWER_A[0],
          3.2,
          TOWER_A[1] + TOWER_A_DIR * (TOP_SIZE / 2 + 3.0),
        ]}
      />
    </group>
  )
}
