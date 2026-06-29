import { useEffect, useRef, useState } from 'react'
import { useBuild } from '../../game/build/buildStore'
import { useTouch, isCoarsePointer } from './touchStore'

const RADIUS = 56 // スティックの可動半径(px)

function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const setStick = useTouch((s) => s.setStick)
  const release = useTouch((s) => s.release)
  const center = useRef<{ x: number; y: number } | null>(null)

  const moveKnob = (dx: number, dy: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  const onDown = (e: React.PointerEvent) => {
    const el = baseRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const r = el.getBoundingClientRect()
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    onMove(e)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!center.current) return
    let dx = e.clientX - center.current.x
    let dy = e.clientY - center.current.y
    const mag = Math.hypot(dx, dy)
    if (mag > RADIUS) {
      dx = (dx / mag) * RADIUS
      dy = (dy / mag) * RADIUS
    }
    moveKnob(dx, dy)
    setStick(dx / RADIUS, -dy / RADIUS) // 画面のうえ＝まえ(+y)
  }
  const onUp = () => {
    center.current = null
    moveKnob(0, 0)
    release()
  }

  return (
    <div
      ref={baseRef}
      className="touch-joystick"
      data-testid="touch-joystick"
      onPointerDown={onDown}
      onPointerMove={(e) => center.current && onMove(e)}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div ref={knobRef} className="touch-knob" />
    </div>
  )
}

function JumpButton() {
  const setJump = useTouch((s) => s.setJump)
  return (
    <button
      className="touch-jump"
      data-testid="touch-jump"
      onPointerDown={(e) => {
        e.preventDefault()
        setJump(true)
      }}
      onPointerUp={() => setJump(false)}
      onPointerLeave={() => setJump(false)}
      onPointerCancel={() => setJump(false)}
    >
      ⬆️
    </button>
  )
}

// タッチ端末でのみ、あそびモード中だけ表示。
export function TouchControls() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => setCoarse(isCoarsePointer()), [])
  const mode = useBuild((s) => s.mode)
  const panel = useBuild((s) => s.panel)

  if (!coarse) return null
  if (mode !== 'play' || panel !== 'none') return null
  return (
    <div className="touch-layer">
      <Joystick />
      <JumpButton />
    </div>
  )
}
