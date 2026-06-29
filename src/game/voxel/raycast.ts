// Amanatides–Woo voxel DDA レイキャスト（純関数・Three非依存）。
// origin から dir 方向へ、predicate(x,y,z)=true のブロックに当たるまでグリッドを進む。
// 当たったセル・その手前セル（設置先）・面法線・距離を返す。

export interface RaycastResult {
  hit: boolean
  cell: [number, number, number] | null
  prev: [number, number, number] | null
  normal: [number, number, number] | null
  distance: number
}

const MISS: RaycastResult = { hit: false, cell: null, prev: null, normal: null, distance: 0 }

export function raycastVoxel(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  isHit: (x: number, y: number, z: number) => boolean,
): RaycastResult {
  // dir 正規化
  const len = Math.hypot(dx, dy, dz)
  if (len === 0) return { ...MISS }
  dx /= len
  dy /= len
  dz /= len

  let x = Math.floor(ox)
  let y = Math.floor(oy)
  let z = Math.floor(oz)

  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0

  const INF = Infinity
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : INF
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : INF
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : INF

  // 最初の境界までの距離
  const fracX = ox - x
  const fracY = oy - y
  const fracZ = oz - z
  let tMaxX = dx > 0 ? (1 - fracX) * tDeltaX : dx < 0 ? fracX * tDeltaX : INF
  let tMaxY = dy > 0 ? (1 - fracY) * tDeltaY : dy < 0 ? fracY * tDeltaY : INF
  let tMaxZ = dz > 0 ? (1 - fracZ) * tDeltaZ : dz < 0 ? fracZ * tDeltaZ : INF

  // 始点が既にブロック内ならそこをヒット扱い（手前なし）
  if (isHit(x, y, z)) {
    return { hit: true, cell: [x, y, z], prev: null, normal: [0, 0, 0], distance: 0 }
  }

  let normal: [number, number, number] = [0, 0, 0]
  let t = 0
  // 進行（上限ステップ数で安全弁）
  for (let i = 0; i < 1024; i++) {
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX
      t = tMaxX
      tMaxX += tDeltaX
      normal = [-stepX, 0, 0]
    } else if (tMaxY < tMaxZ) {
      y += stepY
      t = tMaxY
      tMaxY += tDeltaY
      normal = [0, -stepY, 0]
    } else {
      z += stepZ
      t = tMaxZ
      tMaxZ += tDeltaZ
      normal = [0, 0, -stepZ]
    }
    if (t > maxDist) break
    if (isHit(x, y, z)) {
      return {
        hit: true,
        cell: [x, y, z],
        prev: [x + normal[0], y + normal[1], z + normal[2]],
        normal,
        distance: t,
      }
    }
  }
  return { ...MISS }
}
