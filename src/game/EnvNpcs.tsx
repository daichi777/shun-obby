import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBuild } from './build/buildStore'
import { ITEM_BY_ID } from './build/catalog'
import { groupCenter, effFootprint, type Footprint } from './build/grid'
import { playerSignal } from './playerSignal'

// ============================================================
// 「お客さん」NPC（ブロック人形・物理なし）
//
//  ・息子が置いたアイテム（アトラクション）＋デフォルトの遊び場を自動で検知し、
//    その方へ歩いて行って、着いたら「遊ぶ（よろこんで跳ねる・両手を上げる）」。
//    遊び終わったら次のアトラクションへ。新しく置いたものも巡って遊びにくる。
//  ・Roblox 風の簡易モデル（頭＋胴＋腕2＋脚2）。NPC ごとに服の色ちがい。
//  ・見た目だけ（Physics の外）＝物理パニックの心配なし。
//  ・乱数は毎フレーム使わない（個体差は index 由来、対象選びは巡回カウンタで決定的）。
// ============================================================

const SKIN = '#f2c79a'
const HAIR = '#4a2f1b'
const SHOE = '#3a3f4a'

// デフォルトのアトラクション地点（各エリアの目印。噴水 r~2.4 は避ける）。
const DEFAULT_ATTRACTIONS: [number, number][] = [
  [20, 14], // NE 既存 obby/スライダー
  [50, -48], // 右上 空中アスレチック
  [-48, 50], // 左下 クライミング塔＋つり橋
  [-50, -50], // 左上 とびいしジャンプ
  [55, 55], // 右下 スライド広場
  [-30, 30], // 北西 上空の綱渡り
  [59, 16], // 🌊 ウォーターパークのプール
  [59, 26], // 🌊 流れるプール
  [12, 0],
  [-12, 0],
  [0, 14],
  [0, -14], // 中央広場まわり
]

// 置いたアイテムのワールド位置（x,z）一覧。
function placedAttractionPoints(): [number, number][] {
  const placed = useBuild.getState().placed
  return placed.map((p) => {
    const item = ITEM_BY_ID[p.itemId]
    const fp: Footprint = item ? effFootprint(item.footprint, p.rot) : [1, 1]
    const [x, , z] = groupCenter(p.anchor, fp)
    return [x, z] as [number, number]
  })
}

// NPC が次に向かう先の候補リスト。
// 置いたアイテムは2倍重みで入れる＝息子の作った所に多く集まって遊ぶ。
function pickList(): [number, number][] {
  const placed = placedAttractionPoints()
  return [...placed, ...placed, ...DEFAULT_ATTRACTIONS]
}

interface NpcDef {
  shirt: string
  pants: string
  speed: number
  spawn: [number, number]
}

const NPCS: NpcDef[] = [
  { shirt: '#e63946', pants: '#274690', speed: 1.7, spawn: [-40, -20] },
  { shirt: '#1d6fd1', pants: '#f4a259', speed: 2.0, spawn: [-15, -40] },
  { shirt: '#f2c014', pants: '#3a7d44', speed: 1.8, spawn: [-30, 40] },
  { shirt: '#2a9d4a', pants: '#7b3f9e', speed: 1.6, spawn: [38, -10] },
  { shirt: '#8338ec', pants: '#e85d75', speed: 1.9, spawn: [6, 10] },
  { shirt: '#ff7b29', pants: '#1f6f5c', speed: 1.8, spawn: [-6, 62] },
  { shirt: '#20c0d8', pants: '#324a6d', speed: 1.7, spawn: [60, -18] },
  { shirt: '#ff5fa8', pants: '#3a3f55', speed: 1.9, spawn: [-60, -38] },
]

interface NpcState {
  group: THREE.Group | null
  head: THREE.Group | null
  leftArm: THREE.Mesh | null
  rightArm: THREE.Mesh | null
  leftLeg: THREE.Mesh | null
  rightLeg: THREE.Mesh | null
  pos: THREE.Vector2 // 現在地 (x, z)
  target: THREE.Vector2 // 向かっているアトラクション (x, z)
  heading: number
  swing: number
  playing: boolean // true=到着して遊んでいる
  playTimer: number
  visit: number // 対象選びの巡回カウンタ
}

// デバッグ/検証用：全 NPC の状態を覗ける（window.__game.customers）
const npcStates: NpcState[] = []

function Npc({ def, index }: { def: NpcDef; index: number }) {
  const phaseOffset = index * 1.3
  const bounceSpeed = 1.6 + index * 0.25
  const idleTurnSpeed = 0.7 + index * 0.15

  const st = useRef<NpcState>({
    group: null,
    head: null,
    leftArm: null,
    rightArm: null,
    leftLeg: null,
    rightLeg: null,
    pos: new THREE.Vector2(def.spawn[0], def.spawn[1]),
    target: new THREE.Vector2(def.spawn[0], def.spawn[1]),
    heading: 0,
    swing: phaseOffset,
    playing: false,
    playTimer: 0,
    visit: index, // NPC ごとに開始オフセット＝散らばる
  })

  // 次のアトラクションを選ぶ（巡回カウンタで決定的に。置いたものを優先的に巡る）
  const pickNewTarget = (s: NpcState) => {
    const list = pickList()
    if (list.length === 0) return
    s.visit += 1
    const [tx, tz] = list[(index + s.visit) % list.length]
    s.target.set(tx, tz)
  }

  useEffect(() => {
    npcStates[index] = st.current
    // 最初の目的地を決める
    pickNewTarget(st.current)
    return () => {
      delete npcStates[index]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useFrame((state, delta) => {
    const s = st.current
    const g = s.group
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    let moving = false

    if (s.playing) {
      // ---- 到着＝遊ぶ：大きく跳ねて、その場でくるくる ----
      s.playTimer -= dt
      s.heading += idleTurnSpeed * dt
      g.position.y = Math.abs(Math.sin(t * bounceSpeed * 1.4 + phaseOffset)) * 0.34
      if (s.playTimer <= 0) {
        s.playing = false
        pickNewTarget(s) // 次のアトラクションへ
      }
    } else {
      // ---- 移動中：target へ向かって進む ----
      const toTarget = s.target.clone().sub(s.pos)
      const dist = toTarget.length()
      const step = def.speed * dt
      if (dist <= step || dist < 0.05) {
        s.pos.copy(s.target)
        s.playing = true
        s.playTimer = 3 + (index % 4) * 0.6 // 3〜4.8秒あそぶ
      } else {
        const dir = toTarget.divideScalar(dist)
        s.pos.addScaledVector(dir, step)
        moving = true
        const desired = Math.atan2(dir.x, dir.y)
        s.heading = lerpAngle(s.heading, desired, 1 - Math.exp(-6 * dt))
      }
      g.position.y = 0
    }

    g.position.x = s.pos.x
    g.position.z = s.pos.y
    g.rotation.y = s.heading

    // ---- 視線：近くのプレイヤーを頭で追う（「気づいてる」非言語シグナル）----
    // 半径8m以内かつ前方寄りのときだけ頭を振り向け、それ以外は正面へ戻す。骨1本・物理なし。
    const head = s.head
    if (head) {
      let targetYaw = 0
      let targetPitch = 0
      if (playerSignal.valid) {
        const dx = playerSignal.x - g.position.x
        const dz = playerSignal.z - g.position.z
        const distXZ = Math.hypot(dx, dz)
        if (distXZ > 0.3 && distXZ < 8) {
          const worldAngle = Math.atan2(dx, dz) // +Z 基準（heading と同じ規約）
          const localYaw = normAngle(worldAngle - s.heading) // 頭のローカル回転量
          if (Math.abs(localYaw) < 1.8) {
            // 前方寄りに見えるときだけ振り向く（真後ろには無理に回さない）
            targetYaw = THREE.MathUtils.clamp(localYaw, -1.2, 1.2)
            const dy = playerSignal.y - (g.position.y + 1.74)
            targetPitch = THREE.MathUtils.clamp(-Math.atan2(dy, distXZ) * 0.5, -0.45, 0.45)
          }
        }
      }
      const hk = 1 - Math.exp(-8 * dt)
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetYaw, hk)
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetPitch, hk)
    }

    // ---- 手足 ----
    if (s.playing) {
      // 両手を上げてバンザイ（よろこぶ）／脚は中立
      const k = 1 - Math.exp(-10 * dt)
      if (s.leftArm) s.leftArm.rotation.x = THREE.MathUtils.lerp(s.leftArm.rotation.x, -2.3, k)
      if (s.rightArm) s.rightArm.rotation.x = THREE.MathUtils.lerp(s.rightArm.rotation.x, -2.3, k)
      if (s.leftLeg) s.leftLeg.rotation.x = THREE.MathUtils.lerp(s.leftLeg.rotation.x, 0, k)
      if (s.rightLeg) s.rightLeg.rotation.x = THREE.MathUtils.lerp(s.rightLeg.rotation.x, 0, k)
    } else {
      if (moving) s.swing += dt * def.speed * 4.0
      const amp = moving ? 0.7 : 0
      const ease = moving ? 1 : 1 - Math.exp(-8 * dt)
      const sv = Math.sin(s.swing) * amp
      if (s.leftArm) s.leftArm.rotation.x = THREE.MathUtils.lerp(s.leftArm.rotation.x, sv, ease)
      if (s.rightArm) s.rightArm.rotation.x = THREE.MathUtils.lerp(s.rightArm.rotation.x, -sv, ease)
      if (s.leftLeg) s.leftLeg.rotation.x = THREE.MathUtils.lerp(s.leftLeg.rotation.x, -sv, ease)
      if (s.rightLeg) s.rightLeg.rotation.x = THREE.MathUtils.lerp(s.rightLeg.rotation.x, sv, ease)
    }
  })

  return (
    <group
      ref={(o) => {
        st.current.group = o
      }}
      position={[def.spawn[0], 0, def.spawn[1]]}
    >
      {/* 脚2本（股関節を上端に pivot） */}
      <group position={[-0.18, 0.7, 0]}>
        <mesh ref={(o) => { st.current.leftLeg = o }} castShadow position={[0, -0.35, 0]}>
          <boxGeometry args={[0.26, 0.7, 0.26]} />
          <meshStandardMaterial color={def.pants} />
        </mesh>
      </group>
      <group position={[0.18, 0.7, 0]}>
        <mesh ref={(o) => { st.current.rightLeg = o }} castShadow position={[0, -0.35, 0]}>
          <boxGeometry args={[0.26, 0.7, 0.26]} />
          <meshStandardMaterial color={def.pants} />
        </mesh>
      </group>

      {/* くつ */}
      <mesh castShadow position={[-0.18, 0.04, 0.04]}>
        <boxGeometry args={[0.28, 0.12, 0.34]} />
        <meshStandardMaterial color={SHOE} />
      </mesh>
      <mesh castShadow position={[0.18, 0.04, 0.04]}>
        <boxGeometry args={[0.28, 0.12, 0.34]} />
        <meshStandardMaterial color={SHOE} />
      </mesh>

      {/* 胴（服） */}
      <mesh castShadow position={[0, 1.05, 0]}>
        <boxGeometry args={[0.6, 0.7, 0.34]} />
        <meshStandardMaterial color={def.shirt} />
      </mesh>

      {/* 腕2本（肩を上端に pivot） */}
      <group position={[-0.42, 1.35, 0]}>
        <mesh ref={(o) => { st.current.leftArm = o }} castShadow position={[0, -0.3, 0]}>
          <boxGeometry args={[0.18, 0.62, 0.2]} />
          <meshStandardMaterial color={def.shirt} />
        </mesh>
      </group>
      <group position={[0.42, 1.35, 0]}>
        <mesh ref={(o) => { st.current.rightArm = o }} castShadow position={[0, -0.3, 0]}>
          <boxGeometry args={[0.18, 0.62, 0.2]} />
          <meshStandardMaterial color={def.shirt} />
        </mesh>
      </group>

      {/* 首 */}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.2]} />
        <meshStandardMaterial color={SKIN} />
      </mesh>

      {/* 頭＋髪＋目（頭グループを ref 化して視線で回す） */}
      <group position={[0, 1.74, 0]} ref={(o) => { st.current.head = o }}>
        <mesh castShadow>
          <boxGeometry args={[0.46, 0.46, 0.46]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        <mesh castShadow position={[0, 0.2, -0.02]}>
          <boxGeometry args={[0.5, 0.18, 0.5]} />
          <meshStandardMaterial color={HAIR} />
        </mesh>
        <mesh position={[-0.1, 0.02, 0.235]}>
          <boxGeometry args={[0.07, 0.09, 0.02]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
        <mesh position={[0.1, 0.02, 0.235]}>
          <boxGeometry args={[0.07, 0.09, 0.02]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
      </group>
    </group>
  )
}

// 角度を -PI..PI に正規化（負の剰余に注意）
function normAngle(a: number): number {
  const twoPi = Math.PI * 2
  a = ((a % twoPi) + twoPi) % twoPi
  return a > Math.PI ? a - twoPi : a
}

// 角度を最短まわりで補間
function lerpAngle(from: number, to: number, alpha: number): number {
  let diff = (to - from) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  if (diff < -Math.PI) diff += Math.PI * 2
  return from + diff * alpha
}

export function EnvNpcs() {
  const npcs = useMemo(() => NPCS, [])

  // 検証用デバッグフック（置いたアイテムを検知できているか・各NPCの目的地）
  useEffect(() => {
    const w = window as unknown as { __game?: Record<string, unknown> }
    w.__game = w.__game ?? {}
    w.__game.customers = {
      targets: () => pickList(),
      attractionCount: () => placedAttractionPoints().length + DEFAULT_ATTRACTIONS.length,
      states: () =>
        npcStates
          .filter(Boolean)
          .map((s) => ({
            pos: [+s.pos.x.toFixed(1), +s.pos.y.toFixed(1)],
            target: [+s.target.x.toFixed(1), +s.target.y.toFixed(1)],
            playing: s.playing,
            headYaw: s.head ? +s.head.rotation.y.toFixed(2) : 0, // 視線の振り向き量（検証用）
          })),
    }
  }, [])

  return (
    <group>
      {npcs.map((def, i) => (
        <Npc key={`npc-${i}`} def={def} index={i} />
      ))}
    </group>
  )
}
