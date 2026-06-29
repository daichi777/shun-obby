// 一人称コントローラ（pointer-lock マウス視点 + WASD + 自前 voxel-AABB 衝突）。
// Rapier/ecctrl 非依存。重力・ジャンプ・段差登り・飛行トグル。
// デバッグ層から teleport/状態取得できるよう playerRegistry に登録する。

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useVoxel } from './voxelStore'
import { moveAndCollide, PLAYER_EYE, type Body } from './collision'
import { spawnPoint } from './worldgen'
import { registerPlayer } from './playerRegistry'
import { WORLD_SIZE_X, WORLD_SIZE_Z } from './constants'

const GRAVITY = -26
const JUMP_VEL = 8.6
const WALK_SPEED = 5.0
const RUN_SPEED = 8.5
const FLY_SPEED = 9.0
const MOUSE_SENS = 0.0022
const MAX_PITCH = Math.PI / 2 - 0.05
const HALF_W = 0.3

export function VoxelPlayer() {
  const world = useVoxel((s) => s.world)
  const fly = useVoxel((s) => s.fly)
  const toggleFly = useVoxel((s) => s.toggleFly)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const flyRef = useRef(fly)
  flyRef.current = fly

  const body = useRef<Body>({ x: 0, y: 0, z: 0, vy: 0, onGround: false })
  const yaw = useRef(0)
  const pitch = useRef(0)
  const keys = useRef<Record<string, boolean>>({})
  const moving = useRef(false)

  // 初期スポーン
  useEffect(() => {
    const [sx, sy, sz] = spawnPoint(world)
    body.current.x = sx
    body.current.y = sy
    body.current.z = sz
    body.current.vy = 0
    camera.rotation.order = 'YXZ'
  }, [world, camera])

  // 入力（キー・マウス・pointer lock）
  useEffect(() => {
    const dom = gl.domElement

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      if (e.code === 'KeyF') toggleFly()
      // 数字キー 1..9, 0 でホットバー選択（ポインターロック中でも効く＝本家流）
      const m = /^Digit([0-9])$/.exec(e.code)
      if (m) {
        const st = useVoxel.getState()
        const n = parseInt(m[1], 10)
        const idx = n === 0 ? 9 : n - 1
        if (idx < st.hotbar.length) st.selectBlock(st.hotbar[idx])
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    // マウスホイールでホットバーを順送り（本家流）
    const onWheel = (e: WheelEvent) => {
      const st = useVoxel.getState()
      const hb = st.hotbar
      if (hb.length === 0) return
      let i = hb.indexOf(st.selectedBlockId)
      if (i < 0) i = 0
      i = (i + (e.deltaY > 0 ? 1 : -1) + hb.length) % hb.length
      st.selectBlock(hb[i])
    }
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== dom) return
      yaw.current -= e.movementX * MOUSE_SENS
      pitch.current -= e.movementY * MOUSE_SENS
      pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current))
    }
    const onPointerDown = () => {
      // 未ロック時はクリックで視点ロック（設置/破壊は VoxelInteraction がロック中のみ処理）
      if (document.pointerLockElement !== dom) dom.requestPointerLock()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('wheel', onWheel, { passive: true })
    dom.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('wheel', onWheel)
      dom.removeEventListener('pointerdown', onPointerDown)
    }
  }, [gl, toggleFly])

  // playerRegistry へ登録（debug 用）
  useEffect(() => {
    const dir = new THREE.Vector3()
    return registerPlayer({
      getPos: () => [body.current.x, body.current.y, body.current.z],
      getEyePos: () => [body.current.x, body.current.y + PLAYER_EYE, body.current.z],
      getLookDir: () => {
        camera.getWorldDirection(dir)
        return [dir.x, dir.y, dir.z]
      },
      getOnGround: () => body.current.onGround,
      isMoving: () => moving.current,
      teleport: (x, y, z) => {
        body.current.x = x
        body.current.y = y
        body.current.z = z
        body.current.vy = 0
      },
    })
  }, [camera])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05) // トンネリング防止
    const b = body.current
    const k = keys.current
    const isFly = flyRef.current

    const f = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0)
    const s = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0)
    const run = k['ShiftLeft'] || k['ShiftRight'] ? true : false

    // yaw 基準の水平移動方向
    const sy = Math.sin(yaw.current)
    const cy = Math.cos(yaw.current)
    let mx = -sy * f + cy * s
    let mz = -cy * f + sy * s
    const mlen = Math.hypot(mx, mz)
    moving.current = mlen > 0.0001
    if (moving.current) {
      mx /= mlen
      mz /= mlen
    }

    let dispY: number
    if (isFly) {
      const up = (k['Space'] ? 1 : 0) - (run ? 1 : 0)
      b.vy = 0
      dispY = up * FLY_SPEED * dt
      b.onGround = false
    } else {
      // ジャンプ
      if (k['Space'] && b.onGround) {
        b.vy = JUMP_VEL
        b.onGround = false
      }
      b.vy += GRAVITY * dt
      dispY = b.vy * dt
    }

    const speed = isFly ? FLY_SPEED : run ? RUN_SPEED : WALK_SPEED
    const dx = mx * speed * dt
    const dz = mz * speed * dt

    moveAndCollide(world, b, dx, dz, dispY)

    // ワールド外周で外に出ないよう軽くクランプ
    b.x = Math.max(HALF_W, Math.min(WORLD_SIZE_X - HALF_W, b.x))
    b.z = Math.max(HALF_W, Math.min(WORLD_SIZE_Z - HALF_W, b.z))
    // 奈落に落ちたらスポーンへ復帰
    if (b.y < -6) {
      const [rx, ry, rz] = spawnPoint(world)
      b.x = rx
      b.y = ry
      b.z = rz
      b.vy = 0
    }

    // カメラ反映（目線位置 + yaw/pitch）
    camera.position.set(b.x, b.y + PLAYER_EYE, b.z)
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
  })

  return null
}
