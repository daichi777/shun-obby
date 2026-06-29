import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ============================================================
// 広場をうろうろ歩く「ブロック人形」NPC（かざり・物理なし）
//
//  ・Roblox 風の簡易モデル（頭＋胴＋腕2本＋脚2本）。NPC ごとに服の色ちがい。
//  ・各 NPC は固定の waypoint ループを巡回。線形補間で移動し、進行方向へ向き直る。
//  ・移動中だけ腕・脚を sin 波でふる。停止中は止めて、その場でゆらゆら＋ちょい跳ね。
//  ・乱数は使わず、NPC の index から決まる固定値でばらつきを出す（毎フレーム乱数は禁止方針）。
//  ・<Canvas> 内に <EnvNpcs/> をそのまま置くだけ（props なし・Physics の外でOK）。
//
//  座標メモ（level.ts / Environment.tsx より）:
//    ・地面 80x80・上面 y=0。中央の噴水（半径~2.4・コライダーあり）は避ける。
//    ・obby/スライダーは北東（OBBY_OFFSET=[7,0,12]）に寄っているので NE は通らない。
//    ・木 (±13,±4)/(±4,±13)・ベンチ (±3.9,±3.9)・花壇 (±6.3,±6.3) 等の島を避けた空きレーンを巡回。
//    ・フェンスは ±38。waypoint は ±22 以内に収める。
// ============================================================

// ---- 肌・髪などの共通色 ----
const SKIN = '#f2c79a'
const HAIR = '#4a2f1b'
const SHOE = '#3a3f4a'

interface NpcDef {
  shirt: string // 上半身（服）の色
  pants: string // 下半身（ズボン）の色
  speed: number // 移動スピード（m/s）
  waypoints: [number, number][] // 巡回ループ（x, z）。地面 y=0 を歩く。
}

// 広い(±100)マップを賑やかにするため、各 NPC を遠くまで散らして巡回させる。
// waypoint は ±75 以内（フェンス手前）。物理なしの見た目だけなので多少かざりに近づいてOK。
const NPCS: NpcDef[] = [
  {
    // 赤シャツ：南西を大きくぐるり
    shirt: '#e63946',
    pants: '#274690',
    speed: 1.5,
    waypoints: [
      [-40, -20],
      [-55, 10],
      [-35, 35],
      [-18, 5],
    ],
  },
  {
    // 青シャツ：南側を広く行き来
    shirt: '#1d6fd1',
    pants: '#f4a259',
    speed: 1.8,
    waypoints: [
      [-15, -40],
      [20, -52],
      [42, -30],
      [5, -22],
    ],
  },
  {
    // 黄シャツ：北西〜北のひらけた所
    shirt: '#f2c014',
    pants: '#3a7d44',
    speed: 1.55,
    waypoints: [
      [-30, 40],
      [-8, 55],
      [22, 45],
      [-12, 22],
    ],
  },
  {
    // 緑シャツ：東側（obby より外）をうろうろ
    shirt: '#2a9d4a',
    pants: '#7b3f9e',
    speed: 1.35,
    waypoints: [
      [38, -10],
      [48, 15],
      [32, 32],
      [20, 6],
    ],
  },
  {
    // 紫シャツ：中央広場のまわり（噴水 r~3 は通らない大きめの輪）
    shirt: '#8338ec',
    pants: '#e85d75',
    speed: 1.7,
    waypoints: [
      [0, -9],
      [9, 0],
      [0, 9],
      [-9, 0],
    ],
  },
  {
    // 橙シャツ：北のずっと奥
    shirt: '#ff7b29',
    pants: '#1f6f5c',
    speed: 1.6,
    waypoints: [
      [-6, 62],
      [28, 70],
      [55, 52],
      [12, 40],
    ],
  },
  {
    // 水色シャツ：東〜南東の遠く
    shirt: '#20c0d8',
    pants: '#324a6d',
    speed: 1.45,
    waypoints: [
      [60, -18],
      [70, 22],
      [50, 42],
      [40, 2],
    ],
  },
  {
    // ピンクシャツ：西〜南西の遠く
    shirt: '#ff5fa8',
    pants: '#3a3f55',
    speed: 1.65,
    waypoints: [
      [-60, -38],
      [-75, 6],
      [-52, 46],
      [-42, -8],
    ],
  },
]

// ---- 1体ぶんのランタイム状態（再レンダー無しで useRef に保持） ----
interface NpcState {
  group: THREE.Group | null
  leftArm: THREE.Mesh | null
  rightArm: THREE.Mesh | null
  leftLeg: THREE.Mesh | null
  rightLeg: THREE.Mesh | null
  target: number // 次に向かう waypoint の index
  wait: number // 残りの滞在時間（>0 なら停止中）
  pos: THREE.Vector2 // 現在位置（x, z）
  heading: number // 現在向いている方向（Y回転・ラジアン）
  swing: number // 歩行アニメの位相
}

// ============================================================
// 1体ぶんのブロック人形モデル＋巡回ロジック
// ============================================================
function Npc({ def, index }: { def: NpcDef; index: number }) {
  // index から決まる固定オフセット（乱数を使わずに個体差を出す）
  const phaseOffset = index * 1.3 // 歩行・ゆらぎの位相ずれ
  const bounceSpeed = 1.6 + index * 0.25 // 停止中の跳ねテンポ
  const idleTurnSpeed = 0.6 + index * 0.15 // 停止中にゆっくり回る速さ

  // 最初の停止時間も index から決め打ち（1.5〜3秒のあいだ）
  const initialWait = 1.5 + (index % 3) * 0.5

  const st = useRef<NpcState>({
    group: null,
    leftArm: null,
    rightArm: null,
    leftLeg: null,
    rightLeg: null,
    target: 1 % def.waypoints.length, // 1点目から2点目へ向かう
    wait: initialWait,
    pos: new THREE.Vector2(def.waypoints[0][0], def.waypoints[0][1]),
    heading: 0,
    swing: phaseOffset,
  })

  useFrame((state, delta) => {
    const s = st.current
    const g = s.group
    if (!g) return

    // delta が大きく飛んだとき（タブ復帰など）に暴れないようクランプ
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime

    const wps = def.waypoints
    const tgt = wps[s.target]
    const targetVec = new THREE.Vector2(tgt[0], tgt[1])

    let moving = false

    if (s.wait > 0) {
      // ---- 停止中：その場でゆらゆら回転＋小さく上下に跳ねる ----
      s.wait -= dt
      s.heading += idleTurnSpeed * dt * 0.5
      g.position.y = Math.abs(Math.sin(t * bounceSpeed + phaseOffset)) * 0.12
      if (s.wait <= 0) {
        // 次の waypoint へ向けて出発
        s.target = (s.target + 1) % wps.length
      }
    } else {
      // ---- 移動中：targetVec へ向かって線形に進む ----
      const toTarget = targetVec.clone().sub(s.pos)
      const dist = toTarget.length()
      const step = def.speed * dt

      if (dist <= step || dist < 0.001) {
        // 到着 → そこで止まって滞在（1.5〜3秒。index 由来でばらつき）
        s.pos.copy(targetVec)
        s.wait = 1.5 + ((index + s.target) % 4) * 0.5 * 0.75 + 0.5
      } else {
        const dir = toTarget.divideScalar(dist)
        s.pos.addScaledVector(dir, step)
        moving = true

        // 進行方向へ向き直る（ゆっくり補間）。Three の +Z 前方基準で atan2。
        const desired = Math.atan2(dir.x, dir.y)
        s.heading = lerpAngle(s.heading, desired, 1 - Math.exp(-6 * dt))
      }
      g.position.y = 0
    }

    // 位置・向きを反映
    g.position.x = s.pos.x
    g.position.z = s.pos.y
    g.rotation.y = s.heading

    // ---- 手足の歩行アニメ（移動中だけ振る・停止中は中立へ戻す） ----
    if (moving) {
      s.swing += dt * def.speed * 4.0
    }
    const amp = moving ? 0.7 : 0
    // 中立へなめらかに戻すための減衰
    const ease = moving ? 1 : 1 - Math.exp(-8 * dt)
    const swingVal = Math.sin(s.swing) * amp

    if (s.leftArm) s.leftArm.rotation.x = THREE.MathUtils.lerp(s.leftArm.rotation.x, swingVal, ease)
    if (s.rightArm) s.rightArm.rotation.x = THREE.MathUtils.lerp(s.rightArm.rotation.x, -swingVal, ease)
    if (s.leftLeg) s.leftLeg.rotation.x = THREE.MathUtils.lerp(s.leftLeg.rotation.x, -swingVal, ease)
    if (s.rightLeg) s.rightLeg.rotation.x = THREE.MathUtils.lerp(s.rightLeg.rotation.x, swingVal, ease)
  })

  // 体のパーツ寸法（5歳児が見て可愛い、ずんぐり体型）
  const start = def.waypoints[0]

  return (
    <group
      ref={(o) => {
        st.current.group = o
      }}
      position={[start[0], 0, start[1]]}
    >
      {/* 脚2本（股関節を上端にして、上端まわりに振れるよう pivot を上に置く） */}
      <group position={[-0.18, 0.7, 0]}>
        <mesh
          ref={(o) => {
            st.current.leftLeg = o
          }}
          castShadow
          position={[0, -0.35, 0]}
        >
          <boxGeometry args={[0.26, 0.7, 0.26]} />
          <meshStandardMaterial color={def.pants} />
        </mesh>
      </group>
      <group position={[0.18, 0.7, 0]}>
        <mesh
          ref={(o) => {
            st.current.rightLeg = o
          }}
          castShadow
          position={[0, -0.35, 0]}
        >
          <boxGeometry args={[0.26, 0.7, 0.26]} />
          <meshStandardMaterial color={def.pants} />
        </mesh>
      </group>

      {/* くつ（足の先・かざり） */}
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

      {/* 腕2本（肩を上端にして pivot を肩へ・袖は服色） */}
      <group position={[-0.42, 1.35, 0]}>
        <mesh
          ref={(o) => {
            st.current.leftArm = o
          }}
          castShadow
          position={[0, -0.3, 0]}
        >
          <boxGeometry args={[0.18, 0.62, 0.2]} />
          <meshStandardMaterial color={def.shirt} />
        </mesh>
      </group>
      <group position={[0.42, 1.35, 0]}>
        <mesh
          ref={(o) => {
            st.current.rightArm = o
          }}
          castShadow
          position={[0, -0.3, 0]}
        >
          <boxGeometry args={[0.18, 0.62, 0.2]} />
          <meshStandardMaterial color={def.shirt} />
        </mesh>
      </group>

      {/* 首（肌色・短め） */}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.2]} />
        <meshStandardMaterial color={SKIN} />
      </mesh>

      {/* 頭（箱・肌色）＋髪＋目 */}
      <group position={[0, 1.74, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.46, 0.46, 0.46]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        {/* 髪（頭のうえにかぶせる） */}
        <mesh castShadow position={[0, 0.2, -0.02]}>
          <boxGeometry args={[0.5, 0.18, 0.5]} />
          <meshStandardMaterial color={HAIR} />
        </mesh>
        {/* 目（前 +Z 側に2つ） */}
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

// 角度を最短まわりで補間（-PI..PI を考慮）
function lerpAngle(from: number, to: number, alpha: number): number {
  let diff = (to - from) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  if (diff < -Math.PI) diff += Math.PI * 2
  return from + diff * alpha
}

// ============================================================
// まとめ：全 NPC を配置する自己完結コンポーネント
// ============================================================
export function EnvNpcs() {
  // 定義は固定なので一度だけ確定（再生成しない）
  const npcs = useMemo(() => NPCS, [])
  return (
    <group>
      {npcs.map((def, i) => (
        <Npc key={`npc-${i}`} def={def} index={i} />
      ))}
    </group>
  )
}
