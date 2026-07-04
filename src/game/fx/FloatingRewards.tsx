import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useReward, type FloatText } from './rewardStore'

// ワールドに浮く「+N」テキスト。Sprite なので常にカメラを向く（射影計算は不要）。
// 文字はコード生成の CanvasTexture（外部フォント/画像なし・プロジェクト方針に合わせる）。
const LIFE = 900 // ms
const texCache = new Map<string, THREE.CanvasTexture>()

function textTexture(text: string, color: string): THREE.CanvasTexture {
  const key = `${text}|${color}`
  const hit = texCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 72
  const ctx = c.getContext('2d')!
  ctx.font = '900 46px "Hiragino Maru Gothic ProN", "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 9
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.strokeText(text, 64, 38)
  ctx.fillStyle = color
  ctx.fillText(text, 64, 38)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 2
  texCache.set(key, tex)
  return tex
}

function FloatView({ data, onDone }: { data: FloatText; onDone: (id: number) => void }) {
  const ref = useRef<THREE.Sprite>(null)
  const tex = useMemo(() => textTexture(data.text, data.color), [data.text, data.color])

  useFrame(() => {
    const s = ref.current
    if (!s) return
    const age = (typeof performance !== 'undefined' ? performance.now() : 0) - data.born
    const t = age / LIFE
    if (t >= 1) {
      onDone(data.id)
      return
    }
    // ふわっと上昇
    s.position.set(data.pos[0], data.pos[1] + 0.6 + t * 1.4, data.pos[2])
    // 最初にポンッと出て、あとは少しだけ縮む
    const pop = t < 0.18 ? 0.7 + (t / 0.18) * 0.8 : 1.5 - Math.min(1, (t - 0.18) / 0.82) * 0.35
    s.scale.set(pop * 1.3, pop * 0.73, 1)
    ;(s.material as THREE.SpriteMaterial).opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
  })

  return (
    <sprite ref={ref} position={data.pos}>
      <spriteMaterial
        map={tex}
        transparent
        opacity={1}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  )
}

// Canvas の中に置く：飛んでいる「+N」をすべて描画する。
export function FloatingRewards() {
  const floats = useReward((s) => s.floats)
  const remove = useReward((s) => s.removeFloat)
  return (
    <>
      {floats.map((f) => (
        <FloatView key={f.id} data={f} onDone={remove} />
      ))}
    </>
  )
}
