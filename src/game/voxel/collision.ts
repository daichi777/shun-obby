// プレイヤー衝突（研究 §6.2 の定石: chunk 配列を直接引く自前 voxel-AABB スイープ）。
// Rapier/ecctrl 非依存・純関数でユニットテスト可能。
// position.y は「足元（AABB 下端）」。カメラ目線は y + PLAYER_EYE。

export const PLAYER_HALF_WIDTH = 0.3
export const PLAYER_HEIGHT = 1.62
export const PLAYER_EYE = 1.5
const EPS = 1e-4
const STEP_HEIGHT = 1.0 // 1ブロックの段差を自動で登る

export interface SolidQuery {
  isSolid: (x: number, y: number, z: number) => boolean
}

export interface Body {
  x: number
  y: number
  z: number
  vy: number
  onGround: boolean
}

// AABB（足元 y）が solid voxel と重なるか
function hits(world: SolidQuery, x: number, y: number, z: number): boolean {
  const minX = x - PLAYER_HALF_WIDTH
  const maxX = x + PLAYER_HALF_WIDTH
  const minZ = z - PLAYER_HALF_WIDTH
  const maxZ = z + PLAYER_HALF_WIDTH
  const minY = y
  const maxY = y + PLAYER_HEIGHT
  const x0 = Math.floor(minX)
  const x1 = Math.floor(maxX - EPS)
  const y0 = Math.floor(minY)
  const y1 = Math.floor(maxY - EPS)
  const z0 = Math.floor(minZ)
  const z1 = Math.floor(maxZ - EPS)
  for (let vy = y0; vy <= y1; vy++) {
    for (let vz = z0; vz <= z1; vz++) {
      for (let vx = x0; vx <= x1; vx++) {
        if (world.isSolid(vx, vy, vz)) return true
      }
    }
  }
  return false
}

function moveHorizontal(world: SolidQuery, body: Body, axis: 'x' | 'z', disp: number): void {
  if (disp === 0) return
  const old = body[axis]
  body[axis] = old + disp
  if (!hits(world, body.x, body.y, body.z)) return
  // 段差の自動登り（接地中のみ）
  if (body.onGround) {
    const savedY = body.y
    body.y = savedY + STEP_HEIGHT
    if (!hits(world, body.x, body.y, body.z)) return // 登れた（落下で段の上に着地する）
    body.y = savedY
  }
  body[axis] = old // ブロックされた
}

function moveVertical(world: SolidQuery, body: Body, disp: number): void {
  body.y += disp
  if (!hits(world, body.x, body.y, body.z)) {
    if (disp <= 0) body.onGround = false
    return
  }
  if (disp <= 0) {
    // 落下中に床へ着地: 足元が入り込んだブロックの上面へ
    body.y = Math.floor(body.y) + 1
    body.onGround = true
  } else {
    // 上昇中に天井へ頭をぶつけた
    body.y = Math.floor(body.y + PLAYER_HEIGHT) - PLAYER_HEIGHT
  }
  body.vy = 0
}

// 移動と衝突解決（水平→垂直）。dx/dz は水平変位、dispY は垂直変位。
// 1ブロック未満ずつのサブステップに分割し、高速移動・大きな dt でもトンネリングや
// スナップ先取り違えが起きないようにする（離散 collide-and-snap の堅牢化）。
const MAX_SUBSTEP = 0.4
export function moveAndCollide(
  world: SolidQuery,
  body: Body,
  dx: number,
  dz: number,
  dispY: number,
): void {
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(dx), Math.abs(dz), Math.abs(dispY)) / MAX_SUBSTEP),
  )
  const sx = dx / steps
  const sz = dz / steps
  const sy = dispY / steps
  for (let i = 0; i < steps; i++) {
    moveHorizontal(world, body, 'x', sx)
    moveHorizontal(world, body, 'z', sz)
    moveVertical(world, body, sy)
  }
}
