import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useBuild } from './buildStore'
import { ITEM_BY_ID } from './catalog'
import type { ColliderSpec } from './itemTypes'
import { groupCenter, effFootprint, CELL } from './grid'

// アイテムの collider 指定 → RigidBody の colliders プロパティ。
//   未指定 → hull 自動 / 'none' → 物理なし / {auto} → 指定の自動 / {boxes} → 明示の子で配置
function rbColliders(spec: ColliderSpec | undefined): false | 'hull' | 'cuboid' | 'trimesh' {
  if (spec === undefined) return 'hull'
  if (spec === 'none') return false
  if ('auto' in spec) return spec.auto
  return false
}

// {boxes} 指定のときだけ、明示の CuboidCollider 群を出す。
// RigidBody はスケールなし（scale=1）で置くため、ここで args / position を CELL 倍して
// ワールド寸法に直す（モデルはユニット空間で記述してあるため）。回転は不変。
function ExplicitColliders({ spec, scale }: { spec: ColliderSpec | undefined; scale: number }) {
  if (!spec || spec === 'none' || 'auto' in spec) return null
  return (
    <>
      {spec.boxes.map((b, i) => {
        const p = b.position ?? [0, 0, 0]
        // friction/sensor は「定義されているときだけ」渡す。
        // friction={undefined} を渡すと react-three-rapier が setFriction(undefined)=NaN を呼び、
        // rapier ソルバーが unreachable で panic するため（重要）。
        const extra: { friction?: number; sensor?: boolean } = {}
        if (b.friction !== undefined) extra.friction = b.friction
        if (b.sensor !== undefined) extra.sensor = b.sensor
        return (
          <CuboidCollider
            key={i}
            args={[b.args[0] * scale, b.args[1] * scale, b.args[2] * scale]}
            position={[p[0] * scale, p[1] * scale, p[2] * scale]}
            rotation={b.rotation ?? [0, 0, 0]}
            {...extra}
          />
        )
      })}
    </>
  )
}

// 設置済みアイテム（「うごかす」中はクリックで持ち上げ／「けす」中はクリックで削除）
function PlacedItems() {
  const placed = useBuild((s) => s.placed)
  const moveArmed = useBuild((s) => s.moveArmed)
  const trashArmed = useBuild((s) => s.trashArmed)
  const pickUp = useBuild((s) => s.pickUp)
  const deleteItem = useBuild((s) => s.deleteItem)
  const interactive = moveArmed || trashArmed

  return (
    <>
      {placed.map((p) => {
        const item = ITEM_BY_ID[p.itemId]
        if (!item) return null
        const Model = item.Model
        const fp = effFootprint(item.footprint, p.rot)
        return (
          // RigidBody はスケールなしで設置（react-three-rapier はスケール済み親の下だと
          // 物理同期で再入エラーになるため）。見た目だけ子 group で CELL 倍する。
          <RigidBody
            key={p.uid}
            type="fixed"
            colliders={rbColliders(item.collider)}
            position={groupCenter(p.anchor, fp)}
            rotation={[0, (p.rot * Math.PI) / 2, 0]}
          >
            {/* 見た目（CELL倍）。auto(hull等)colliderはこのスケール済みメッシュから生成される */}
            <group scale={CELL}>
              <group
                onClick={
                  interactive
                    ? (e) => {
                        e.stopPropagation()
                        if (trashArmed) deleteItem(p.uid)
                        else pickUp(p.uid)
                      }
                    : undefined
                }
              >
                <Model />
              </group>
            </group>
            {/* 明示collider は RigidBody 直下（スケール1）に、CELL倍した world 寸法で置く */}
            <ExplicitColliders spec={item.collider} scale={CELL} />
          </RigidBody>
        )
      })}
    </>
  )
}

// 設置プレビュー（ゴースト：半透明モデル＋緑/赤タイル）
function GhostModel({ itemId }: { itemId: string }) {
  const ref = useRef<THREE.Group>(null)
  const item = ITEM_BY_ID[itemId]
  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    g.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.material) {
        const m = mesh.material as THREE.Material
        m.transparent = true
        m.opacity = 0.55
        m.depthWrite = false
      }
    })
  }, [itemId])
  if (!item) return null
  const Model = item.Model
  return (
    <group ref={ref}>
      <Model />
    </group>
  )
}

const FAIL_FLASH_MS = 350 // 置けないタップ後、赤タイルをパルスさせる時間

function Ghost() {
  const hover = useBuild((s) => s.hover)
  const selectedItemId = useBuild((s) => s.selectedItemId)
  const rotation = useBuild((s) => s.rotation)
  const canPlace = useBuild((s) => s.canPlaceHover())
  const tileRef = useRef<THREE.Mesh>(null)

  // おっとソフトフェイル：置けない場所をタップした直後、赤タイルがビクッと脈打つ
  useFrame(() => {
    const tile = tileRef.current
    if (!tile) return
    const m = tile.material as THREE.MeshBasicMaterial
    const now = typeof performance !== 'undefined' ? performance.now() : 0
    const age = now - useBuild.getState().failFlashAt
    if (age >= 0 && age < FAIL_FLASH_MS) {
      const k = 1 - age / FAIL_FLASH_MS
      const pulse = 1 + 0.18 * Math.abs(Math.sin((age / FAIL_FLASH_MS) * Math.PI * 3)) * k
      tile.scale.set(pulse, pulse, 1)
      m.opacity = 0.5 + 0.4 * k
    } else {
      tile.scale.set(1, 1, 1)
      m.opacity = 0.5
    }
  })

  if (!hover || !selectedItemId) return null
  const item = ITEM_BY_ID[selectedItemId]
  if (!item) return null
  const fp = effFootprint(item.footprint, rotation)
  const [cx, , cz] = groupCenter(hover, fp)
  const [w, d] = fp

  return (
    <group>
      {/* おけるところを示すタイル（みどり=OK / あか=だめ）。CELL 倍でアイテムの占有面積に合わせる */}
      <mesh ref={tileRef} position={[cx, 0.04, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * CELL, d * CELL]} />
        <meshBasicMaterial
          color={canPlace ? '#3fd65c' : '#ff5252'}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      {/* 半透明プレビュー（回転を反映・CELL 倍で大きく） */}
      <group position={[cx, 0, cz]} rotation={[0, (rotation * Math.PI) / 2, 0]} scale={CELL}>
        <GhostModel itemId={selectedItemId} />
      </group>
    </group>
  )
}

// 設置中だけ現れる、ポインターを受ける地面（透明・広場ぜんたい）
function BuildGround() {
  const setHoverWorld = useBuild((s) => s.setHoverWorld)
  const placeAtHover = useBuild((s) => s.placeAtHover)
  return (
    <mesh
      position={[0, 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={(e) => {
        e.stopPropagation()
        setHoverWorld(e.point.x, e.point.z)
      }}
      onClick={(e) => {
        e.stopPropagation()
        // タップした地点をそのまま設置位置にする（ワンタップ設置・タッチ対応）
        setHoverWorld(e.point.x, e.point.z)
        placeAtHover()
      }}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export function PlacementSystem() {
  const mode = useBuild((s) => s.mode)
  const building = mode === 'placing' || mode === 'moving'
  return (
    <>
      <PlacedItems />
      {building && <BuildGround />}
      {building && <Ghost />}
    </>
  )
}
