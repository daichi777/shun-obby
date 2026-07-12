// 寛容ジャンプ（ジャンプバッファ＋コヨーテタイム）の状態機械。
// 幼児の「押したのに跳ばない！」をなくす:
//   ・バッファ: 着地の直前(JUMP_BUFFER_S)に押したジャンプを覚えて、着地の瞬間に発火
//   ・コヨーテ: 足場を離れて間もなければ(COYOTE_S)、空中でも跳べる（落下開始時のみ）
//
// 発火方法は2種類で使い分ける（ecctrl の内部実装に合わせた設計・実測で確認済み）:
//   ・バッファ → effJump で ecctrl に「合成入力エッジ」を与え、本物のジャンプをさせる。
//     接地中は floating スプリング(gravityScale=0＋強い減衰)が縦速度を毎ステップ消すため
//     直接 setLinvel しても不発。ecctrl 自身の jumpActive だけがスプリングを抑制できる。
//     ecctrl はエッジ検出(canJumpAgain=一度離すまで再ジャンプ不可)なので、バッファ待機中は
//     生入力をマスク(false)して確実に再アームし、発火時に true を短く保持して渡す。
//   ・コヨーテ → 呼び出し側が body.setLinvel で直接跳ばす。空中はスプリング非作動なので
//     速度がそのまま生きる（ecctrl は非接地では跳んでくれないため直接与えるしかない）。
//
// 純関数＋自前stateにして vitest で固定する。Player.tsx が毎フレーム step を呼ぶ。

export const JUMP_BUFFER_S = 0.15 // 着地前の先行入力を覚える時間
export const COYOTE_S = 0.1 // 足場を離れてもジャンプできる猶予
export const JUMP_CD_S = 0.25 // 発火後のクールダウン（二重ジャンプ防止）
export const FIRE_HOLD_S = 0.08 // 合成エッジの保持時間（useFrame順序による1フレーム遅延を吸収）
export const COYOTE_MAX_VY = 0.5 // これより上昇中は発火不可（通常ジャンプ直後の二段防止）
export const TAKEOFF_VY = 1 // これを超えて上昇し始めたら「跳べた」とみなし保持を終える

export interface FJState {
  buffer: number // 残りバッファ時間
  firing: number // 合成エッジの残り保持時間
  sinceGrounded: number // 足場を離れてからの経過時間
  cd: number // 残りクールダウン
  prevJump: boolean // 立ち上がり検出用
}

export const createFJState = (): FJState => ({
  buffer: 0,
  firing: 0,
  sinceGrounded: 0,
  cd: 0,
  prevJump: false,
})

export interface FJInput {
  jump: boolean // 生のジャンプ入力（キー＋タッチ合成）
  onGround: boolean
  vy: number // 縦速度
  dt: number
}

export interface FJResult {
  effJump: boolean // ecctrl の setMovement へ渡すジャンプ入力
  coyoteJump: boolean // 空中猶予での発火（→ 呼び出し側が setLinvel で直接跳ばす）
  bufferedJump: boolean // 着地先行入力での発火の瞬間（効果音・カウンタ用）
}

export function stepForgivingJump(s: FJState, input: FJInput): FJResult {
  const pressed = input.jump && !s.prevJump
  s.prevJump = input.jump
  s.cd = Math.max(0, s.cd - input.dt)
  if (input.onGround) s.sinceGrounded = 0
  else s.sinceGrounded += input.dt

  let coyoteJump = false
  let bufferedJump = false

  // 空中で押した → コヨーテ猶予内なら直接ジャンプ、外れたら着地バッファに記憶
  if (pressed && !input.onGround) {
    if (s.sinceGrounded <= COYOTE_S && input.vy <= COYOTE_MAX_VY && s.cd <= 0) {
      coyoteJump = true
      s.cd = JUMP_CD_S
      s.buffer = 0
    } else {
      s.buffer = JUMP_BUFFER_S
    }
  } else if (pressed) {
    // 接地中に新たに押した＝古い先行入力は上書き（生エッジを ecctrl へ素通しする）
    s.buffer = 0
  } else {
    s.buffer = Math.max(0, s.buffer - input.dt)
  }

  // 接地＋バッファ生存 → 合成エッジの発火開始。
  //   ・接地中の生入力エッジは ecctrl の通常ジャンプに任せる（!pressed で二重防止）
  //   ・上昇中は発火しない（ecctrl は離陸直後も接地扱いが数フレーム残るため）
  if (input.onGround && s.buffer > 0 && s.cd <= 0 && !pressed && input.vy <= COYOTE_MAX_VY) {
    bufferedJump = true
    s.buffer = 0
    s.cd = JUMP_CD_S
    s.firing = FIRE_HOLD_S
  }

  // effJump: 通常は生入力をそのまま。バッファ待機中はマスク（ecctrl の canJumpAgain を
  // 確実に再アーム）、発火中は true を保持（跳べたら vy で検知して終了）。
  let effJump = input.jump
  if (s.firing > 0) {
    s.firing = Math.max(0, s.firing - input.dt)
    if (input.vy > TAKEOFF_VY) s.firing = 0
    else effJump = true
  } else if (s.buffer > 0) {
    effJump = false
  }

  return { effJump, coyoteJump, bufferedJump }
}
