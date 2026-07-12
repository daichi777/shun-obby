import { describe, it, expect, beforeEach } from 'vitest'
import {
  createFJState,
  stepForgivingJump,
  type FJState,
  type FJInput,
  JUMP_BUFFER_S,
  COYOTE_S,
} from './forgivingJump'

// 寛容ジャンプ（バッファ＋コヨーテ）の挙動を 60fps のフレーム列で固定する。
//   ・bufferedJump=true のあと effJump が合成エッジとして ecctrl へ渡る
//   ・coyoteJump=true のフレームで Player が setLinvel で直接跳ばす
const DT = 1 / 60

let s: FJState
beforeEach(() => {
  s = createFJState()
})

const step = (over: Partial<FJInput>) =>
  stepForgivingJump(s, { jump: false, onGround: true, vy: 0, dt: DT, ...over })

// n フレームぶん同じ入力で回す（最後のフレームの結果を返す）
const run = (n: number, over: Partial<FJInput>) => {
  let last = step(over)
  for (let i = 1; i < n; i++) last = step(over)
  return last
}

describe('通常ジャンプは邪魔しない', () => {
  it('接地中に押したら生入力がそのまま通る（ecctrl の通常ジャンプ）', () => {
    run(3, {}) // 接地して静止
    const r = step({ jump: true })
    expect(r.effJump).toBe(true)
    expect(r.coyoteJump).toBe(false)
    expect(r.bufferedJump).toBe(false)
  })
})

describe('ジャンプバッファ（着地の先行入力）', () => {
  // 落下中（コヨーテ猶予が切れた高さ）まで進めるヘルパー
  const fall = () => {
    run(3, {})
    run(10, { onGround: false, vy: -3 })
  }

  it('空中で押して 0.15 秒以内に着地したら、着地の瞬間に合成エッジで発火する', () => {
    fall()
    step({ jump: true, onGround: false, vy: -3 }) // 空中で押す
    step({ jump: false, onGround: false, vy: -3 }) // すぐ離す
    const frames = Math.floor((JUMP_BUFFER_S - 0.05) / DT)
    run(frames, { onGround: false, vy: -3 }) // バッファ期限内で落ち続ける
    const r = step({ onGround: true, vy: -3 }) // 着地
    expect(r.bufferedJump).toBe(true)
    expect(r.effJump).toBe(true) // 合成エッジ
  })

  it('バッファ待機中は生入力をマスクする（ecctrl の再アームのため）', () => {
    fall()
    step({ jump: true, onGround: false, vy: -3 }) // 押しっぱなしにする
    const r = step({ jump: true, onGround: false, vy: -3 })
    expect(r.effJump).toBe(false) // 押していても ecctrl には離した扱い
  })

  it('発火後は跳べる（vy が立つ）まで合成エッジを保持する', () => {
    fall()
    step({ jump: true, onGround: false, vy: -3 })
    step({ jump: false, onGround: false, vy: -3 })
    step({ onGround: true, vy: -3 }) // 発火
    const r = step({ onGround: true, vy: 0 }) // まだ跳べていない（物理反映待ち）
    expect(r.effJump).toBe(true) // 保持中
    const r2 = step({ onGround: true, vy: 6.5 }) // ジャンプ成立（上昇開始）
    expect(r2.effJump).toBe(false) // 保持終了
  })

  it('押しっぱなしのまま着地しても発火は1回だけ', () => {
    fall()
    step({ jump: true, onGround: false, vy: -3 })
    run(3, { jump: true, onGround: false, vy: -3 }) // 押しっぱなしで落下
    const r = step({ jump: true, onGround: true, vy: -3 }) // 着地（まだ押している）
    expect(r.bufferedJump).toBe(true)
    const r2 = step({ jump: true, onGround: true, vy: 0 })
    expect(r2.bufferedJump).toBe(false) // クールダウン中は再発火しない
  })

  it('0.15 秒より前に押した入力は忘れる', () => {
    fall()
    step({ jump: true, onGround: false, vy: -3 })
    step({ jump: false, onGround: false, vy: -3 })
    const frames = Math.ceil((JUMP_BUFFER_S + 0.05) / DT) // 期限切れまで落下
    run(frames, { onGround: false, vy: -3 })
    const r = step({ onGround: true, vy: -3 })
    expect(r.bufferedJump).toBe(false)
  })

  it('通常ジャンプ直後の上昇中は、接地判定が残っていても発火しない', () => {
    // ecctrl は離陸直後も rayHitForgiveness で数フレーム onGround=true が残る。
    run(3, {})
    step({ jump: true, onGround: false, vy: -1 }) // 接地判定の谷間で押した＝バッファ記憶
    step({ jump: true, onGround: true, vy: 6.5 }) // 直後に通常ジャンプ成立・上昇開始（接地判定は残存）
    const r = step({ jump: false, onGround: true, vy: 6.4 })
    expect(r.bufferedJump).toBe(false)
    expect(r.coyoteJump).toBe(false)
  })

  it('着地フレームちょうどの生エッジは ecctrl に任せて発火しない（二重防止）', () => {
    fall()
    step({ jump: true, onGround: false, vy: -3 }) // 空中で押す（バッファ記憶）
    step({ jump: false, onGround: false, vy: -3 }) // 離す
    const r = step({ jump: true, onGround: true, vy: -3 }) // 着地と同時に新たなエッジ
    expect(r.bufferedJump).toBe(false) // 生エッジ側（ecctrl）が跳ぶ
    expect(r.effJump).toBe(true)
  })
})

describe('コヨーテタイム（足場を離れた直後）', () => {
  it('離れて 0.1 秒以内・落下し始めなら空中でも跳べる', () => {
    run(5, {})
    run(3, { onGround: false, vy: -0.5 }) // 3フレーム(0.05s)だけ空中
    const r = step({ jump: true, onGround: false, vy: -0.5 })
    expect(r.coyoteJump).toBe(true)
  })

  it('0.1 秒を過ぎたらコヨーテ不可（かわりにバッファへ記憶）', () => {
    run(5, {})
    const frames = Math.ceil((COYOTE_S + 0.05) / DT)
    run(frames, { onGround: false, vy: -2 })
    const r = step({ jump: true, onGround: false, vy: -2 })
    expect(r.coyoteJump).toBe(false)
    // その入力はバッファとして生きていて、すぐ着地すれば跳べる
    const r2 = step({ onGround: true, vy: -2 })
    expect(r2.bufferedJump).toBe(true)
  })

  it('上昇中（通常ジャンプ直後）はコヨーテで二段ジャンプできない', () => {
    run(5, {})
    run(2, { onGround: false, vy: 6 }) // ジャンプで上昇中
    const r = step({ jump: true, onGround: false, vy: 6 })
    expect(r.coyoteJump).toBe(false)
  })

  it('コヨーテ発火の直後はクールダウンで連発できない', () => {
    run(5, {})
    run(2, { onGround: false, vy: -0.5 })
    const r = step({ jump: true, onGround: false, vy: -0.5 })
    expect(r.coyoteJump).toBe(true)
    step({ jump: false, onGround: false, vy: -0.5 })
    const r2 = step({ jump: true, onGround: false, vy: -0.5 })
    expect(r2.coyoteJump).toBe(false)
  })
})
