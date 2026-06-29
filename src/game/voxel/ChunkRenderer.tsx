// チャンクメッシュの imperative 管理（R3F は薄いマウント役）。
// - world.onDirty を購読し、dirty チャンクを useFrame で予算内に再メッシュ
// - 1チャンク = 不透明メッシュ + 半透明メッシュ（みず/ガラス）
// - tris/totalVertices/drawCalls/fps を perf レジストリへ供給（§3.0）
// - geometry.dispose を徹底（GPU メモリ解放）

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useVoxel } from './voxelStore'
import { chunkKey } from './coords'
import { meshChunk, type MeshArrays } from './mesher'
import { paintAtlas, ATLAS_PX } from './atlas'
import {
  setFps,
  setDrawCalls,
  setMeshTotals,
  incRemesh,
  setDirtyChunks,
} from './perf'

interface ChunkMeshes {
  opaque: THREE.Mesh | null
  transparent: THREE.Mesh | null
}

function buildGeometry(arr: MeshArrays): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(arr.positions, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(arr.normals, 3))
  g.setAttribute('color', new THREE.BufferAttribute(arr.colors, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(arr.uvs, 2))
  g.setIndex(new THREE.BufferAttribute(arr.indices, 1))
  g.computeBoundingSphere()
  return g
}

// 手続き生成のピクセルアート・テクスチャアトラスを作る（ブラウザ実行時のみ）。
// NearestFilter でカリッとしたドット絵に（ぼかさない）。
function buildAtlasTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_PX
  canvas.height = ATLAS_PX
  const ctx = canvas.getContext('2d')!
  paintAtlas(ctx)
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.flipY = false // UV は v0=テクスチャ上端で計算している
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

const FRAME_BUDGET = 6 // 1フレームあたり最大再メッシュ数（初期ロードを分散）

export function ChunkRenderer() {
  const world = useVoxel((s) => s.world)
  const groupRef = useRef<THREE.Group>(null)
  const { gl } = useThree()

  const meshes = useRef(new Map<string, ChunkMeshes>())
  const dirty = useRef(new Set<string>())
  const opaqueMat = useRef<THREE.MeshBasicMaterial | null>(null)
  const transMat = useRef<THREE.MeshBasicMaterial | null>(null)

  // fps 計測
  const frames = useRef(0)
  const acc = useRef(0)

  const atlas = useRef<THREE.Texture | null>(null)

  useEffect(() => {
    // テクスチャ × 頂点カラー(brightness=shade×light×ao) を MeshBasicMaterial で合成（二重照明なし）。
    const tex = buildAtlasTexture()
    atlas.current = tex
    opaqueMat.current = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true })
    transMat.current = new THREE.MeshBasicMaterial({
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
    // drawCalls を自前キャプチャするため自動リセットを止める（§3.0）
    gl.info.autoReset = false

    const matO = opaqueMat.current
    const matT = transMat.current
    const meshMap = meshes.current
    return () => {
      for (const m of meshMap.values()) {
        m.opaque?.geometry.dispose()
        m.transparent?.geometry.dispose()
      }
      meshMap.clear()
      matO.dispose()
      matT.dispose()
      tex.dispose()
      gl.info.autoReset = true
    }
  }, [gl])

  // dirty 購読 + 既存チャンクを初期 dirty に
  useEffect(() => {
    for (const c of world.chunks.values()) dirty.current.add(chunkKey(c.cx, c.cz))
    const unsub = world.onDirty((cx, cz) => {
      dirty.current.add(chunkKey(cx, cz))
    })
    return unsub
  }, [world])

  function parseKey(key: string): [number, number] {
    const i = key.indexOf(',')
    return [parseInt(key.slice(0, i), 10), parseInt(key.slice(i + 1), 10)]
  }

  // 1チャンク再メッシュ
  function remesh(key: string): void {
    const group = groupRef.current
    if (!group || !opaqueMat.current || !transMat.current) return
    const [cx, cz] = parseKey(key)
    const data = meshChunk(world, cx, cz)
    let entry = meshes.current.get(key)
    if (!entry) {
      entry = { opaque: null, transparent: null }
      meshes.current.set(key, entry)
    }

    // 不透明パス
    if (data.opaque) {
      const geo = buildGeometry(data.opaque)
      if (entry.opaque) {
        entry.opaque.geometry.dispose()
        entry.opaque.geometry = geo
      } else {
        const mesh = new THREE.Mesh(geo, opaqueMat.current)
        mesh.castShadow = true
        mesh.receiveShadow = true
        entry.opaque = mesh
        group.add(mesh)
      }
    } else if (entry.opaque) {
      group.remove(entry.opaque)
      entry.opaque.geometry.dispose()
      entry.opaque = null
    }

    // 半透明パス
    if (data.transparent) {
      const geo = buildGeometry(data.transparent)
      if (entry.transparent) {
        entry.transparent.geometry.dispose()
        entry.transparent.geometry = geo
      } else {
        const mesh = new THREE.Mesh(geo, transMat.current)
        mesh.receiveShadow = true
        entry.transparent = mesh
        group.add(mesh)
      }
    } else if (entry.transparent) {
      group.remove(entry.transparent)
      entry.transparent.geometry.dispose()
      entry.transparent = null
    }

    incRemesh()
  }

  function recomputeTotals(): void {
    let tris = 0
    let verts = 0
    let meshed = 0
    for (const m of meshes.current.values()) {
      let has = false
      for (const mesh of [m.opaque, m.transparent]) {
        if (!mesh) continue
        has = true
        const idx = mesh.geometry.getIndex()
        if (idx) tris += idx.count / 3
        const pos = mesh.geometry.getAttribute('position')
        if (pos) verts += pos.count
      }
      if (has) meshed++
    }
    setMeshTotals(tris, verts, meshed)
  }

  useFrame((_, dt) => {
    // dirty を予算内で処理
    let budget = FRAME_BUDGET
    let processed = false
    for (const key of dirty.current) {
      if (budget-- <= 0) break
      remesh(key)
      dirty.current.delete(key)
      processed = true
    }
    if (processed) recomputeTotals()
    setDirtyChunks([...dirty.current])

    // fps
    frames.current++
    acc.current += dt
    if (acc.current >= 0.5) {
      setFps(Math.round(frames.current / acc.current))
      frames.current = 0
      acc.current = 0
    }

    // drawCalls（前フレームのレンダ結果を読み、リセット）
    setDrawCalls(gl.info.render.calls)
    gl.info.reset()
  })

  return <group ref={groupRef} />
}
