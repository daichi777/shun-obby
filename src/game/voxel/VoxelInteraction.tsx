// 設置/破壊のライブ操作（pointer-lock 中のマウス）＋ 照準ブロックのハイライト枠。
// 左クリック=こわす / 右クリック=おく（選択中ブロックを手前セルへ）。
// ロジックの本体は debug.ts の placeBlock/breakBlock と同じ VoxelWorld 経路を通る。

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useVoxel } from './voxelStore'
import { raycastVoxel } from './raycast'
import { getPlayer } from './playerRegistry'
import { REACH } from './constants'
import { AIR } from './blocks'
import { PLAYER_HALF_WIDTH, PLAYER_HEIGHT } from './collision'
import type { VoxelWorld } from './VoxelWorld'

// prev セルがプレイヤーの体と重なるか（自分の中に置けないように）
function cellInsidePlayer(cx: number, cy: number, cz: number): boolean {
  const p = getPlayer()
  if (!p) return false
  const [px, py, pz] = p.getPos()
  const minX = Math.floor(px - PLAYER_HALF_WIDTH)
  const maxX = Math.floor(px + PLAYER_HALF_WIDTH)
  const minZ = Math.floor(pz - PLAYER_HALF_WIDTH)
  const maxZ = Math.floor(pz + PLAYER_HALF_WIDTH)
  const minY = Math.floor(py)
  const maxY = Math.floor(py + PLAYER_HEIGHT - 1e-4)
  return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY && cz >= minZ && cz <= maxZ
}

export function placeBlock(world: VoxelWorld, cell: [number, number, number], id: number): boolean {
  const [x, y, z] = cell
  if (!world.inBounds(x, y, z)) return false
  if (world.getBlock(x, y, z) !== AIR) return false
  if (cellInsidePlayer(x, y, z)) return false
  return world.setBlock(x, y, z, id)
}

export function breakBlock(world: VoxelWorld, x: number, y: number, z: number): boolean {
  if (world.getBlock(x, y, z) === AIR) return false
  return world.setBlock(x, y, z, AIR)
}

export function VoxelInteraction() {
  const world = useVoxel((s) => s.world)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const highlight = useRef<THREE.LineSegments>(null)
  const target = useRef<{ cell: [number, number, number]; prev: [number, number, number] | null } | null>(null)

  const _dir = useRef(new THREE.Vector3())

  useEffect(() => {
    const dom = gl.domElement
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== dom) return // 未ロック時は VoxelPlayer がロック要求
      const t = target.current
      if (!t) return
      const st = useVoxel.getState()
      if (e.button === 0) {
        breakBlock(world, t.cell[0], t.cell[1], t.cell[2])
      } else if (e.button === 2 && t.prev) {
        placeBlock(world, t.prev, st.selectedBlockId)
      }
    }
    const onContext = (e: Event) => e.preventDefault()
    dom.addEventListener('mousedown', onMouseDown)
    dom.addEventListener('contextmenu', onContext)
    return () => {
      dom.removeEventListener('mousedown', onMouseDown)
      dom.removeEventListener('contextmenu', onContext)
    }
  }, [gl, world])

  useFrame(() => {
    const dir = _dir.current
    camera.getWorldDirection(dir)
    const hit = raycastVoxel(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      dir.x,
      dir.y,
      dir.z,
      REACH,
      (x, y, z) => world.isSolid(x, y, z),
    )
    const hl = highlight.current
    if (hit.hit && hit.cell) {
      target.current = { cell: hit.cell, prev: hit.prev }
      if (hl) {
        hl.visible = true
        hl.position.set(hit.cell[0] + 0.5, hit.cell[1] + 0.5, hit.cell[2] + 0.5)
      }
    } else {
      target.current = null
      if (hl) hl.visible = false
    }
  })

  return (
    <lineSegments ref={highlight} visible={false} renderOrder={999}>
      <edgesGeometry args={[new THREE.BoxGeometry(1.004, 1.004, 1.004)]} />
      <lineBasicMaterial color="#101015" transparent opacity={0.9} depthTest={false} />
    </lineSegments>
  )
}
