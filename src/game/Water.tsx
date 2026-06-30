import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'

// ============================================================
// カートゥーン調の「本当に流れる水」一式（子ども向け・明るくポップ・軽量）
//   ・アセット画像なし。実行時に CanvasTexture で水もよう（流れすじ＋泡＋
//     まるいハイライト＝コースティック風）を描く。
//   ・useFrame で (1) texture.offset をずらして流れ、(2) 面の頂点を sin波で
//     上下させて「うねって流れる」、(3) 法線を再計算して光が波に乗る、
//     (4) きらめき(Sparkles)で水面のキラキラ。
//   ・あたり判定（collider）は付けない＝見た目だけ（物理バグなし）。
// 使いまわせる <FlowingWater>（小川・水路・池兼用）と、丸い <WaterPool> を提供。
// ============================================================

// --- カートゥーン水テクスチャ（流れすじ・泡・コースティック） ---
export function makeWaterTexture(base: string, hi: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context unavailable for water texture')

  // ベース＝上下でほんのり濃淡をつけたシアンのグラデ
  const grad = ctx.createLinearGradient(0, 0, 0, size)
  grad.addColorStop(0, base)
  grad.addColorStop(0.5, hi)
  grad.addColorStop(1, base)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  ctx.globalAlpha = 1
  ctx.fillStyle = base
  ctx.globalAlpha = 0.55
  ctx.fillRect(0, 0, size, size)
  ctx.globalAlpha = 1

  // やわらかい流れすじ（流れる方向のうねり線）
  ctx.lineCap = 'round'
  ctx.strokeStyle = hi
  for (let row = 0; row < 9; row++) {
    const y = (row + 0.5) * (size / 9)
    const amp = 6 + (row % 3) * 4
    ctx.lineWidth = 4 + (row % 2) * 3
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    for (let x = 0; x <= size; x += 8) {
      const yy = y + Math.sin((x / size) * Math.PI * 4 + row) * amp
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  // 白い泡のすじ（流れの速い所）
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.5
  for (const fy of [size * 0.28, size * 0.62, size * 0.85]) {
    ctx.beginPath()
    for (let x = 0; x <= size; x += 6) {
      const yy = fy + Math.sin((x / size) * Math.PI * 6) * 5
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  // まるい白ハイライト（コースティック＝光のゆらぎ風）
  ctx.fillStyle = '#ffffff'
  const spots: [number, number, number, number][] = [
    [40, 50, 11, 0.55],
    [150, 90, 15, 0.45],
    [200, 180, 10, 0.5],
    [80, 200, 13, 0.45],
    [120, 30, 8, 0.5],
    [220, 60, 9, 0.5],
    [30, 150, 9, 0.45],
    [175, 230, 11, 0.4],
  ]
  for (const [sx, sy, r, a] of spots) {
    ctx.globalAlpha = a
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

// 面のセグメント数（波の細かさ）を、サイズから決める（軽さのため上限つき）。
const segFor = (len: number): number => Math.min(28, Math.max(6, Math.round(len / 1.6)))

export interface FlowingWaterProps {
  /** 中心位置 [x, y, z]。y は水面の高さ */
  position?: [number, number, number]
  /** 見た目サイズ [はば, ながさ] */
  size?: [number, number]
  /** 平面を Y 軸まわりに回転（ラジアン）。流れの向きに */
  rotationY?: number
  /** UV スクロール速度 [u/秒, v/秒]。v が「流れる方向」 */
  flow?: [number, number]
  /** テクスチャの繰り返し回数 [u, v] */
  repeat?: [number, number]
  color?: string
  highlight?: string
  opacity?: number
  /** 波の高さ（世界単位）。0で平ら */
  waveHeight?: number
}

// 長方形の流れる水（小川・水路・池）。XZ 平面に寝かせ、頂点をうねらせて流す。
export function FlowingWater({
  position = [0, 0.08, 0],
  size = [3, 12],
  rotationY = 0,
  flow = [0.02, 0.16],
  repeat = [1, 4],
  color = '#4cc9f0',
  highlight = '#bff0ff',
  opacity = 0.82,
  waveHeight = 0.14,
}: FlowingWaterProps) {
  const geomRef = useRef<THREE.PlaneGeometry>(null)
  const baseXY = useRef<Float32Array | null>(null)
  const tex = useMemo(() => makeWaterTexture(color, highlight), [color, highlight])
  const segW = segFor(size[0])
  const segL = segFor(size[1])

  useEffect(() => {
    tex.repeat.set(repeat[0], repeat[1])
    return () => tex.dispose()
  }, [tex, repeat])

  useFrame((state, delta) => {
    // 流れ：テクスチャを毎フレームずらす
    tex.offset.x += flow[0] * delta
    tex.offset.y += flow[1] * delta
    // うねり：頂点の z（面の法線方向＝設置後は上下）を進行波で動かす
    const g = geomRef.current
    if (!g) return
    const pos = g.attributes.position
    if (!baseXY.current || baseXY.current.length !== pos.array.length) {
      baseXY.current = Float32Array.from(pos.array as ArrayLike<number>)
    }
    const b = baseXY.current
    const t = state.clock.elapsedTime
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 3]
      const y = b[i * 3 + 1]
      // ★波は「水位より上にだけ」持ち上げる（z は常に 0..waveHeight）。
      //   こうしないと谷が地面(y=0)に潜り、水面がパッチ状に途切れて見える。
      const w1 = Math.sin(y * 0.55 + t * 2.1) * 0.5 + 0.5 // 0..1
      const w2 = Math.sin(x * 0.5 + y * 0.9 - t * 1.4) * 0.5 + 0.5 // 0..1
      pos.setZ(i, waveHeight * (w1 * 0.7 + w2 * 0.3))
    }
    pos.needsUpdate = true
    g.computeVertexNormals() // 光が波に乗る（キラッと流れて見える）
  })

  return (
    <group>
      <mesh position={position} rotation={[-Math.PI / 2, 0, rotationY]} receiveShadow>
        <planeGeometry ref={geomRef} args={[size[0], size[1], segW, segL]} />
        <meshStandardMaterial
          map={tex}
          color={color}
          transparent
          opacity={opacity}
          emissive={color}
          emissiveIntensity={0.16}
          metalness={0.0}
          roughness={0.28}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 水面のキラキラ */}
      <Sparkles
        position={[position[0], position[1] + 0.25, position[2]]}
        count={Math.min(40, Math.round((size[0] * size[1]) / 12))}
        scale={[size[0] * 0.92, 0.5, size[1] * 0.92]}
        size={3}
        speed={0.4}
        opacity={0.7}
        color={highlight}
      />
    </group>
  )
}

export interface WaterPoolProps {
  position?: [number, number, number]
  radius?: number
  flow?: [number, number]
  repeat?: number
  color?: string
  highlight?: string
  opacity?: number
}

// 丸い浅いプール。水面がゆらゆら波うつ（呼吸＋上下）＋きらめき。
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
    if (surfRef.current) {
      const t = state.clock.elapsedTime
      const s = 1 + Math.sin(t * 1.3) * 0.02
      surfRef.current.scale.set(s, s, 1)
      surfRef.current.position.y = position[1] + Math.sin(t * 0.9) * 0.02
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
      {/* 水面のキラキラ */}
      <Sparkles
        position={[0, position[1] + 0.25, 0]}
        count={Math.min(36, Math.round(radius * radius * 1.4))}
        scale={[radius * 1.6, 0.5, radius * 1.6]}
        size={3}
        speed={0.4}
        opacity={0.7}
        color={highlight}
      />
    </group>
  )
}
