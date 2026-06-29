// チャンクの face culling メッシュ生成（純関数・忠実コア）。
// テクスチャ（UV）+ 頂点アンビエントオクルージョン(AO) + sky/block light + 面シェードを焼き込む。
// 頂点カラーは「明るさスカラー(brightness=shade×light×ao)」を r=g=b に入れ、色相はテクスチャが担う
// （MeshBasicMaterial が map.rgb × vertexColor.rgb で合成＝二重に色を掛けない）。
// ※ greedy meshing は同じ純関数メッシャの最適化として S8 で差し替え可能（§0.2）。

import { SECTION, WORLD_HEIGHT, ENABLE_AO } from './constants'
import { chunkOriginX, chunkOriginZ } from './coords'
import { AIR, getBlock as getBlockType, isOpaque, type BlockId } from './blocks'
import { blockFaceTile, tileUV } from './atlas'
import type { VoxelWorld } from './VoxelWorld'

// 光レベル(0..15)を明るさ係数(0..1)へ。最低環境光を残し、ガンマっぽく持ち上げる。
const MIN_LIGHT = 0.12
export function lightToFactor(level: number): number {
  const t = level / 15
  return MIN_LIGHT + (1 - MIN_LIGHT) * (t * t * 0.7 + t * 0.3)
}

// AO段階(0..3)→明るさ係数。0=最も奥まって暗い。
const AO_FACTOR = [0.5, 0.7, 0.86, 1.0]

export interface MeshArrays {
  positions: Float32Array
  normals: Float32Array
  colors: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}

export interface ChunkMeshData {
  opaque: MeshArrays | null
  transparent: MeshArrays | null
  triangles: number
}

// faceKind: 0=上(+Y), 1=下(-Y), 2=側面
interface Face {
  off: readonly [number, number, number]
  normal: readonly [number, number, number]
  corners: readonly (readonly [number, number, number])[]
  uv: readonly (readonly [number, number])[] // 各 corner の (u,v)（v0=テクスチャ上端）
  shade: number
  kind: 0 | 1 | 2
  axisA: readonly [number, number, number]
  axisB: readonly [number, number, number]
  aoSigns: readonly (readonly [number, number])[] // 各 corner の (signA, signB)
}

const FACES: Face[] = [
  // TOP +Y
  {
    off: [0, 1, 0], normal: [0, 1, 0], kind: 0, shade: 1.0,
    corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
    axisA: [1, 0, 0], axisB: [0, 0, 1],
    aoSigns: [[-1, -1], [-1, 1], [1, 1], [1, -1]],
  },
  // BOTTOM -Y
  {
    off: [0, -1, 0], normal: [0, -1, 0], kind: 1, shade: 0.5,
    corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
    uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
    axisA: [1, 0, 0], axisB: [0, 0, 1],
    aoSigns: [[-1, 1], [-1, -1], [1, -1], [1, 1]],
  },
  // NORTH -Z
  {
    off: [0, 0, -1], normal: [0, 0, -1], kind: 2, shade: 0.68,
    corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    uv: [[1, 1], [0, 1], [0, 0], [1, 0]],
    axisA: [1, 0, 0], axisB: [0, 1, 0],
    aoSigns: [[1, -1], [-1, -1], [-1, 1], [1, 1]],
  },
  // SOUTH +Z
  {
    off: [0, 0, 1], normal: [0, 0, 1], kind: 2, shade: 0.8,
    corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]],
    axisA: [1, 0, 0], axisB: [0, 1, 0],
    aoSigns: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  },
  // WEST -X
  {
    off: [-1, 0, 0], normal: [-1, 0, 0], kind: 2, shade: 0.62,
    corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]],
    axisA: [0, 0, 1], axisB: [0, 1, 0],
    aoSigns: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  },
  // EAST +X
  {
    off: [1, 0, 0], normal: [1, 0, 0], kind: 2, shade: 0.88,
    corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    uv: [[1, 1], [0, 1], [0, 0], [1, 0]],
    axisA: [0, 0, 1], axisB: [0, 1, 0],
    aoSigns: [[1, -1], [-1, -1], [-1, 1], [1, 1]],
  },
]

class Builder {
  positions: number[] = []
  normals: number[] = []
  colors: number[] = []
  uvs: number[] = []
  indices: number[] = []
  private vcount = 0

  addQuad(
    bx: number, by: number, bz: number,
    face: Face,
    bright: readonly [number, number, number, number],
    u0: number, v0: number, u1: number, v1: number,
  ): void {
    const base = this.vcount
    const n = face.normal
    for (let i = 0; i < 4; i++) {
      const c = face.corners[i]
      this.positions.push(bx + c[0], by + c[1], bz + c[2])
      this.normals.push(n[0], n[1], n[2])
      const w = bright[i]
      this.colors.push(w, w, w)
      const uvc = face.uv[i]
      this.uvs.push(uvc[0] === 0 ? u0 : u1, uvc[1] === 0 ? v0 : v1)
    }
    // AO に応じて四角形の対角線を反転（光のにじみアーティファクト軽減・本家流）
    if (bright[0] + bright[2] > bright[1] + bright[3]) {
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    } else {
      this.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base)
    }
    this.vcount += 4
  }

  isEmpty(): boolean {
    return this.indices.length === 0
  }

  toArrays(): MeshArrays {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      uvs: new Float32Array(this.uvs),
      indices: new Uint32Array(this.indices),
    }
  }
}

function hidesFace(neighborId: BlockId, selfId: BlockId, selfTransparent: boolean): boolean {
  const nt = getBlockType(neighborId)
  if (nt.opaque) return true
  if (selfTransparent && neighborId === selfId) return true
  return false
}

// 1コーナーの AO 段階(0..3) を 3近傍の遮蔽から求める。
function cornerAO(s1: boolean, s2: boolean, c: boolean): number {
  if (s1 && s2) return 0
  return 3 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (c ? 1 : 0))
}

export function meshChunk(world: VoxelWorld, cx: number, cz: number): ChunkMeshData {
  const ox = chunkOriginX(cx)
  const oz = chunkOriginZ(cz)
  const opaque = new Builder()
  const transparent = new Builder()

  for (let ly = 0; ly < WORLD_HEIGHT; ly++) {
    for (let lz = 0; lz < SECTION; lz++) {
      for (let lx = 0; lx < SECTION; lx++) {
        const wx = ox + lx
        const wz = oz + lz
        const id = world.getBlock(wx, ly, wz)
        if (id === AIR) continue
        const bt = getBlockType(id)
        const target = bt.transparent ? transparent : opaque
        for (let f = 0; f < 6; f++) {
          const face = FACES[f]
          const ax = wx + face.off[0]
          const ay = ly + face.off[1]
          const az = wz + face.off[2]
          const nId = world.getBlock(ax, ay, az)
          if (hidesFace(nId, id, bt.transparent)) continue

          // 露出面セルの光（face ライティング）
          const sky = world.getSkyLight(ax, ay, az)
          const block = world.getBlockLight(ax, ay, az)
          const lf = lightToFactor(Math.max(sky, block))
          const baseBright = face.shade * lf

          // 4コーナーの AO
          const A = face.axisA
          const B = face.axisB
          const bright: [number, number, number, number] = [1, 1, 1, 1]
          for (let i = 0; i < 4; i++) {
            let aoF = 1
            if (ENABLE_AO) {
              const [sa, sb] = face.aoSigns[i]
              const o1 = isOpaque(world.getBlock(ax + A[0] * sa, ay + A[1] * sa, az + A[2] * sa))
              const o2 = isOpaque(world.getBlock(ax + B[0] * sb, ay + B[1] * sb, az + B[2] * sb))
              const oc = isOpaque(
                world.getBlock(ax + A[0] * sa + B[0] * sb, ay + A[1] * sa + B[1] * sb, az + A[2] * sa + B[2] * sb),
              )
              aoF = AO_FACTOR[cornerAO(o1, o2, oc)]
            }
            bright[i] = baseBright * aoF
          }

          const tile = blockFaceTile(id, face.kind)
          const { u0, v0, u1, v1 } = tileUV(tile)
          target.addQuad(wx, ly, wz, face, bright, u0, v0, u1, v1)
        }
      }
    }
  }

  const op = opaque.isEmpty() ? null : opaque.toArrays()
  const tr = transparent.isEmpty() ? null : transparent.toArrays()
  const triangles = (op ? op.indices.length / 3 : 0) + (tr ? tr.indices.length / 3 : 0)
  return { opaque: op, transparent: tr, triangles }
}
