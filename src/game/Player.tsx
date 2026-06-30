import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { Ecctrl, type EcctrlHandle } from 'ecctrl'
import { useGame } from '../store'
import { useBuild } from './build/buildStore'
import { useTouch } from '../ui/mobile/touchStore'
import { playJump, playLand } from './audio'
import { playerSignal } from './playerSignal'

// KeyboardControls のマップ名（App.tsx と一致）
type Controls = 'forward' | 'backward' | 'leftward' | 'rightward' | 'jump' | 'run'

// 追従カメラの設定。
// 固定アングル（つねに同じ向きから見おろす）で、キャラの「いち」に合わせてなめらかに移動する。
// 子どもがあそびやすいよう、視点はまわさず一定。広場ぜんたいが見わたせる距離感に。
const CAM_OFFSET = new THREE.Vector3(0, 7.5, 13) // キャラからのカメラ位置（うしろ＋うえ）
const CAM_LOOK_HEIGHT = 1.2 // キャラのどのくらい上を見るか
const CAM_LERP_K = 6 // 追従のなめらかさ（大きいほどキビキビ）
// 一人称（Fキー）用
const FP_EYE = 0.5 // めの高さ（カプセル中心からの上オフセット）
const MOUSE_SENS = 0.0022 // マウスで見まわす感度
const MAX_PITCH = Math.PI / 2 - 0.05 // 上下の見まわし限界
const _camDesired = new THREE.Vector3()
const _camTarget = new THREE.Vector3()
const _fpHead = new THREE.Vector3()

// プレイヤー本体（ecctrl の物理キャラクターコントローラ）。
// camera は ecctrl が三人称で自動追従する。
export function Player() {
  const ref = useRef<EcctrlHandle>(null)

  // ecctrl 2.0.0 はキーボードを内蔵しないので、毎フレーム入力を setMovement() に渡す
  const [, getKeys] = useKeyboardControls<Controls>()

  // ビルド中はキャラ操作を止めて、設置しやすい固定視点にする
  const buildMode = useBuild((s) => s.mode)

  // 追従カメラはアクティブな three カメラを直接うごかす（ecctrl の移動方向もこのカメラ基準）
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const camReady = useRef(false)

  // 一人称視点（Fキー）。yaw/pitch はマウスで見まわす角度。
  const firstPerson = useRef(false)
  const yaw = useRef(0)
  const pitch = useRef(0)
  // 入力リスナを貼り直さずに最新の buildMode を読むためのミラー
  const buildModeRef = useRef(buildMode)
  buildModeRef.current = buildMode

  // ---- 効果音用の状態（ジャンプ・着地の検出） ----
  const prevJump = useRef(false)
  const prevOnGround = useRef(true)
  const airTime = useRef(0)

  // ---- Playwright 自動プレイテスト用デバッグフック ----
  const fpsRef = useRef(60)
  const frames = useRef(0)
  const acc = useRef(0)
  // teleport は外部から呼ぶと rapier の物理ステップと競合する（recursive use）ため、
  // useFrame 内（＝安全なタイミング）で適用するようキューに積む。
  const pendingTeleport = useRef<[number, number, number] | null>(null)

  useFrame((_, dt) => {
    // 予約された瞬間移動を、物理ステップ外の安全なタイミングで適用
    if (pendingTeleport.current && ref.current) {
      const [tx, ty, tz] = pendingTeleport.current
      ref.current.body.setTranslation({ x: tx, y: ty, z: tz }, true)
      ref.current.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      pendingTeleport.current = null
    }

    // 最新の物理状態を共有シグナルへ（水しぶき検出・浮き輪などが毎フレーム読む）
    if (ref.current) {
      const pp = ref.current.currPos
      const vv = ref.current.currLinVel
      playerSignal.x = pp.x
      playerSignal.y = pp.y
      playerSignal.z = pp.z
      playerSignal.vy = vv?.y ?? 0
      playerSignal.speedH = vv ? Math.hypot(vv.x, vv.z) : 0
      playerSignal.onGround = !!ref.current.isOnGround
      playerSignal.valid = true
    }

    // 入力をコントローラへ反映（キーボード＋タッチスティックを合成）
    const k = getKeys()
    const t = useTouch.getState()
    let forward = k.forward
    let backward = k.backward
    let leftward = k.leftward
    let rightward = k.rightward
    if (t.active && Math.hypot(t.x, t.y) > 0.25) {
      if (t.y > 0.35) forward = true
      if (t.y < -0.35) backward = true
      if (t.x < -0.35) leftward = true
      if (t.x > 0.35) rightward = true
    }
    const jump = k.jump || t.jump
    if (ref.current) {
      ref.current.setMovement({ forward, backward, leftward, rightward, jump, run: k.run })
    }

    // ジャンプ／着地の効果音（あそびモードのみ）
    if (ref.current && buildMode === 'play') {
      const onGround = ref.current.isOnGround
      // ジャンプ: ジャンプ入力の立ち上がり＋接地中
      if (jump && !prevJump.current && onGround) {
        playJump()
      }
      // 着地: 空中→接地の遷移。すこし宙にいたときだけ鳴らす（坂での連打防止）
      if (onGround && !prevOnGround.current && airTime.current > 0.15) {
        playLand()
      }
      airTime.current = onGround ? 0 : airTime.current + dt
      prevOnGround.current = onGround
    }
    prevJump.current = jump

    // カメラ（あそびモードのみ。ビルド中は設置しやすいよう止める）。
    //   一人称(Fキー): あたまの位置＋マウス視点（スライダーを“乗ってる目線”で滑れる）
    //   三人称       : うしろ＋うえから、なめらかに追従
    if (ref.current && buildMode === 'play') {
      const p = ref.current.currPos
      if (firstPerson.current) {
        _fpHead.set(p.x, p.y + FP_EYE, p.z)
        camera.position.copy(_fpHead)
        camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
      } else {
        _camDesired.copy(p).add(CAM_OFFSET)
        if (!camReady.current) {
          // 初回はワープで合わせて、起動時にカメラがビューンと飛ばないように
          camera.position.copy(_camDesired)
          camReady.current = true
        } else {
          // フレームレートに依存しないなめらかな補間（一人称から戻るときもスッと引く）
          const a = 1 - Math.exp(-CAM_LERP_K * dt)
          camera.position.lerp(_camDesired, a)
        }
        _camTarget.set(p.x, p.y + CAM_LOOK_HEIGHT, p.z)
        camera.lookAt(_camTarget)
      }
    }

    // FPS 計測
    frames.current += 1
    acc.current += dt
    if (acc.current >= 0.5) {
      fpsRef.current = Math.round(frames.current / acc.current)
      frames.current = 0
      acc.current = 0
    }
  })

  useEffect(() => {
    const api = {
      getState: () => ({
        coins: useGame.getState().coins,
        totalCoins: useGame.getState().totalCoins,
        playerPos: ref.current ? ref.current.currPos.toArray() : null,
        cameraPos: camera.position.toArray(),
        isOnGround: ref.current ? ref.current.isOnGround : null,
        isMoving: ref.current ? ref.current.isMoving : null,
        firstPerson: firstPerson.current,
        fps: fpsRef.current,
      }),
      teleport: (x: number, y: number, z: number) => {
        // 直接 setTranslation せず、useFrame で安全に適用（物理ステップとの競合回避）
        pendingTeleport.current = [x, y, z]
      },
      // テスト用: プログラムから動かす（実キー入力の代替・補助）
      setMovement: (m: {
        forward?: boolean
        backward?: boolean
        leftward?: boolean
        rightward?: boolean
        jump?: boolean
        run?: boolean
      }) => ref.current?.setMovement(m),
    }
    // 既存の __game（build など）を壊さないようにマージ
    const w = window as unknown as { __game?: Record<string, unknown> }
    w.__game = { ...(w.__game ?? {}), ...api, setFirstPerson: (on: boolean) => { firstPerson.current = on } }
  }, [])

  // 一人称視点（Fキー）: マウスで見まわし。スライダーを“乗ってる目線”で滑れる。
  useEffect(() => {
    const dom = gl.domElement
    // ポインターロック不可の環境（iframe/ヘッドレス等）でも例外/エラーを出さない
    const requestLock = () => {
      try {
        const r = dom.requestPointerLock?.() as unknown as Promise<void> | undefined
        if (r && typeof r.catch === 'function') r.catch(() => {})
      } catch {
        /* ポインターロック非対応はそのまま（視点操作はマウス無しでも遊べる） */
      }
    }
    const enterFP = () => {
      yaw.current = 0
      pitch.current = 0
      firstPerson.current = true
      camera.rotation.order = 'YXZ'
      requestLock()
    }
    const exitFP = () => {
      firstPerson.current = false // 三人称へはスッと引いて戻る（camReady は保持）
      if (document.pointerLockElement === dom) document.exitPointerLock()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF') return
      if (buildModeRef.current !== 'play') return // ビルド中は切り替えない
      firstPerson.current ? exitFP() : enterFP()
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!firstPerson.current || document.pointerLockElement !== dom) return
      yaw.current -= e.movementX * MOUSE_SENS
      pitch.current -= e.movementY * MOUSE_SENS
      pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current))
    }
    const onPointerDown = () => {
      // 一人称中にロックが外れていたら、クリックで再ロック
      if (firstPerson.current && document.pointerLockElement !== dom) requestLock()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousemove', onMouseMove)
    dom.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousemove', onMouseMove)
      dom.removeEventListener('pointerdown', onPointerDown)
    }
  }, [gl, camera])

  // ビルドモードに入ったら一人称を解除し、設置しやすい三人称ビューへスナップ
  useEffect(() => {
    if (buildMode === 'play') return
    firstPerson.current = false
    if (document.pointerLockElement) document.exitPointerLock()
    if (ref.current) {
      const p = ref.current.currPos
      camera.position.set(p.x + CAM_OFFSET.x, p.y + CAM_OFFSET.y, p.z + CAM_OFFSET.z)
      camera.lookAt(p.x, p.y + CAM_LOOK_HEIGHT, p.z)
    }
  }, [buildMode, camera])

  return (
    <Ecctrl
      ref={ref}
      name="player"
      enable={buildMode === 'play'}
      position={[0, 3, 4]}
      capsuleHalfHeight={0.35}
      capsuleRadius={0.3}
      maxWalkVel={2.5}
      maxRunVel={4}
      jumpVel={6.5}
      slopeMaxAngle={0.5}
    >
      <CharacterModel bodyRef={ref} fpRef={firstPerson} />
    </Ecctrl>
  )
}

// Roblox風のブロック人形（あたま・どう・うで2・あし2）。
// 物理は ecctrl のカプセルのまま。見た目はカプセル中心(原点)まわりに組む。
// 移動中(isMoving)だけ うで/あし を sin波で前後に振る（currLinVel で速さに合わせる）。
function CharacterModel({
  bodyRef,
  fpRef,
}: {
  bodyRef: { current: EcctrlHandle | null }
  fpRef: { current: boolean }
}) {
  const root = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const phase = useRef(0)

  useFrame((_, dt) => {
    // 一人称のときは自分の体を隠す（カメラが頭の中に入って見えなくなるのを防ぐ）
    if (root.current) root.current.visible = !fpRef.current
    const b = bodyRef.current
    const v = b?.currLinVel
    const vy = v?.y ?? 0
    const speedH = v ? Math.hypot(v.x, v.z) : 0
    const onGround = b?.isOnGround ?? true
    // すべり判定：非接地で、ぐんぐん下りながら横にも進んでいる＝スライダー滑走中
    const sliding = !!b && !onGround && vy < -2 && speedH > 1.5
    const moving = b?.isMoving ?? false

    const k = 1 - Math.exp(-14 * dt) // なめらかにポーズを補間
    const ease = (g: THREE.Group | null, target: number) => {
      if (g) g.rotation.x += (target - g.rotation.x) * k
    }

    if (sliding) {
      // すべるポーズ：おすわり（脚を前へ）＋ ばんざい（腕を上げて「ヒャッホー！」）
      ease(legL.current, -1.3)
      ease(legR.current, -1.3)
      ease(armL.current, -2.5)
      ease(armR.current, -2.5)
    } else {
      if (moving) phase.current += dt * (5 + speedH * 1.4)
      const amp = moving ? Math.min(0.75, 0.28 + speedH * 0.12) : 0
      const s = Math.sin(phase.current) * amp
      ease(legL.current, s)
      ease(legR.current, -s)
      ease(armL.current, -s)
      ease(armR.current, s)
    }
  })

  return (
    <group ref={root}>
      {/* どう（あかいシャツ） */}
      <mesh castShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[0.36, 0.44, 0.24]} />
        <meshStandardMaterial color="#ff5d5d" />
      </mesh>

      {/* あたま */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[0.32, 0.3, 0.3]} />
        <meshStandardMaterial color="#ffd9a0" />
      </mesh>
      {/* かみ */}
      <mesh castShadow position={[0, 0.605, -0.01]}>
        <boxGeometry args={[0.34, 0.08, 0.32]} />
        <meshStandardMaterial color="#6b4a2a" />
      </mesh>
      {/* め（しろ＋くろ） */}
      <mesh position={[0.08, 0.47, 0.152]}>
        <boxGeometry args={[0.06, 0.08, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.08, 0.47, 0.152]}>
        <boxGeometry args={[0.06, 0.08, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.08, 0.46, 0.162]}>
        <boxGeometry args={[0.03, 0.04, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.08, 0.46, 0.162]}>
        <boxGeometry args={[0.03, 0.04, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* うで（かたを支点にふる） */}
      <group ref={armR} position={[0.255, 0.24, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}>
          <boxGeometry args={[0.11, 0.36, 0.13]} />
          <meshStandardMaterial color="#ff5d5d" />
        </mesh>
        <mesh castShadow position={[0, -0.4, 0]}>
          <boxGeometry args={[0.11, 0.09, 0.13]} />
          <meshStandardMaterial color="#ffd9a0" />
        </mesh>
      </group>
      <group ref={armL} position={[-0.255, 0.24, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}>
          <boxGeometry args={[0.11, 0.36, 0.13]} />
          <meshStandardMaterial color="#ff5d5d" />
        </mesh>
        <mesh castShadow position={[0, -0.4, 0]}>
          <boxGeometry args={[0.11, 0.09, 0.13]} />
          <meshStandardMaterial color="#ffd9a0" />
        </mesh>
      </group>

      {/* あし（こしを支点にふる・あおいズボン＋くつ） */}
      <group ref={legR} position={[0.09, -0.12, 0]}>
        <mesh castShadow position={[0, -0.21, 0]}>
          <boxGeometry args={[0.14, 0.42, 0.16]} />
          <meshStandardMaterial color="#2f6df0" />
        </mesh>
        <mesh castShadow position={[0, -0.45, 0.02]}>
          <boxGeometry args={[0.16, 0.09, 0.2]} />
          <meshStandardMaterial color="#5a3b2a" />
        </mesh>
      </group>
      <group ref={legL} position={[-0.09, -0.12, 0]}>
        <mesh castShadow position={[0, -0.21, 0]}>
          <boxGeometry args={[0.14, 0.42, 0.16]} />
          <meshStandardMaterial color="#2f6df0" />
        </mesh>
        <mesh castShadow position={[0, -0.45, 0.02]}>
          <boxGeometry args={[0.16, 0.09, 0.2]} />
          <meshStandardMaterial color="#5a3b2a" />
        </mesh>
      </group>
    </group>
  )
}
