import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ============================================================
// カートゥーン調の「流れる水」一式（子ども向け・明るくポップ）
//   ・アセット画像なし。実行時に CanvasTexture で水もよう（ストライプ＋
//     まるいハイライト＝コースティック風）を描く。
//   ・useFrame で texture.offset を毎フレームずらして「水が流れる」表現。
//   ・あたり判定（collider）は付けない＝見た目だけ。
// 使いまわせる <FlowingWater>（小川・プール兼用）と、
// 丸い <WaterPool>（角丸の浅いプール）を提供する。
// ============================================================

// --- カートゥーン水テクスチャ（流れ・うねりの線） ---
// 横じまの波線＋ところどころ白いまるいハイライトで「水っぽさ」を出す。
export function makeWaterTexture(base: string, hi: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context unavailable for water texture')

  // ベースのシアン
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  // やわらかい横なみの線（流れる方向のすじ）
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.strokeStyle = hi
  for (let row = 0; row < 7; row++) {
    const y = (row + 0.5) * (size / 7)
    const amp = 7 + (row % 3) * 3
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    for (let x = 0; x <= size; x += 8) {
      const yy = y + Math.sin((x / size) * Math.PI * 4 + row) * amp
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  // まるい白ハイライト（コースティック＝光のゆらぎ風）
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ffffff'
  const spots: [number, number, number][] = [
    [40, 50, 10],
    [150, 90, 14],
    [200, 180, 9],
    [80, 200, 12],
    [120, 30, 7],
    [220, 60, 8],
    [30, 150, 8],
  ]
  for (const [sx, sy, r] of spots) {
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export interface FlowingWaterProps {
  /** 中心位置 [x, y, z]。y は水面の高さ（地面ツライチ気味に） */
  position?: [number, number, number]
  /** 水路の見た目サイズ [はば, ながさ] */
  size?: [number, number]
  /** 平面を Y 軸まわりに回転（ラジアン）。小川の向きに */
  rotationY?: number
  /** UV スクロール速度 [u/秒, v/秒]。v が「流れる方向」 */
  flow?: [number, number]
  /** テクスチャの繰り返し回数 [u, v] */
  repeat?: [number, number]
  /** ベースのシアン色 */
  color?: string
  /** さざ波の線・ハイライト色 */
  highlight?: string
  /** 透明度 */
  opacity?: number
}

// 長方形の流れる水（小川・水路向け）。XZ 平面に寝かせて配置。
export function FlowingWater({
  position = [0, 0.08, 0],
  size = [3, 12],
  rotationY = 0,
  flow = [0.02, 0.16],
  repeat = [1, 4],
  color = '#4cc9f0',
  highlight = '#bff0ff',
  opacity = 0.82,
}: FlowingWaterProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const tex = useMemo(() => makeWaterTexture(color, highlight), [color, highlight])

  useEffect(() => {
    tex.repeat.set(repeat[0], repeat[1])
    return () => tex.dispose()
  }, [tex, repeat])

  useFrame((_, delta) => {
    // テクスチャを毎フレームずらして「流れて見える」
    tex.offset.x += flow[0] * delta
    tex.offset.y += flow[1] * delta
  })

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, rotationY]}
      receiveShadow
    >
      <planeGeometry args={[size[0], size[1]]} />
      <meshStandardMaterial
        ref={matRef}
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        emissive={color}
        emissiveIntensity={0.18}
        metalness={0.0}
        roughness={0.35}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export interface WaterPoolProps {
  /** 中心位置 [x, y, z] */
  position?: [number, number, number]
  /** 水面の半径 */
  radius?: number
  /** UV スクロール速度 [u/秒, v/秒] */
  flow?: [number, number]
  /** テクスチャの繰り返し回数 */
  repeat?: number
  color?: string
  highlight?: string
  opacity?: number
}

// 丸い浅いプール。水面がゆらゆら波うつ（スケールの微小アニメ）。
export function WaterPool({
  position = [0, 0.1, 0],
  radius = 5,
  flow = [0.05, 0.05],
  repeat = 2,
  color = '#4cc9f0',
  highlight = '#bff0ff',
  opacity = 0.8,
}: WaterPoolProps) {
  const surfRef = useRef<THREE.Mesh>(null)
  const tex = useMemo(() => makeWaterTexture(color, highlight), [color, highlight])

  useEffect(() => {
    tex.repeat.set(repeat, repeat)
    return () => tex.dispose()
  }, [tex, repeat])

  useFrame((state, delta) => {
    tex.offset.x += flow[0] * delta
    tex.offset.y += flow[1] * delta
    // 水面をふわっと波うたせる（呼吸するような上下＋微小スケール）
    if (surfRef.current) {
      const t = state.clock.elapsedTime
      const s = 1 + Math.sin(t * 1.3) * 0.015
      surfRef.current.scale.set(s, s, 1)
      surfRef.current.position.y = position[1] + Math.sin(t * 0.9) * 0.015
    }
  })

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* プールのふち（明るい石・浅い縁取り）。あたり判定なし＝通りぬけOK */}
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[radius + 0.5, radius + 0.7, 0.18, 40]} />
        <meshStandardMaterial color="#e8eef5" />
      </mesh>
      {/* 内側のうすい底（水の下） */}
      <mesh receiveShadow position={[0, 0.07, 0]}>
        <cylinderGeometry args={[radius, radius, 0.12, 40]} />
        <meshStandardMaterial color="#7fd8f5" />
      </mesh>
      {/* 波うつ水面 */}
      <mesh ref={surfRef} position={[0, position[1], 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial
          map={tex}
          color={color}
          transparent
          opacity={opacity}
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.0}
          roughness={0.3}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
