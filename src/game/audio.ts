// ゲームの音（BGM＋効果音）を一括で管理するシングルトン。
// React/Canvas のどこからでも import して鳴らせるよう、プレーンな TS モジュールにしている。
// 音源は public/audio/ に配置（higgsfield 生成）。
//
// 自動再生ポリシー対策: ブラウザは「ユーザー操作」前は音を鳴らせないので、
// 最初のキー入力／クリック／タッチで BGM を開始する（一度だけ）。
//
// テスト用: window.__audio に発火カウンタを出し、Playwright で「音が鳴ったか」を数値検証できる。

type SfxName = 'coin' | 'jump' | 'land' | 'clear'

const SFX_SRC: Record<SfxName, string> = {
  coin: '/audio/coin.mp3',
  jump: '/audio/jump.mp3',
  land: '/audio/land.mp3',
  clear: '/audio/clear.m4a',
}

const SFX_VOL: Record<SfxName, string | number> = {
  coin: 0.55,
  jump: 0.4,
  land: 0.32,
  clear: 0.7,
}

const BGM_SRC = '/audio/bgm.m4a'
const BGM_VOL = 0.26

interface AudioDebug {
  coin: number
  jump: number
  land: number
  clear: number
  ui: number
  splash: number
  checkpoint: number
  bgmStarted: boolean
  muted: boolean
  toggleMute: () => boolean
  setMuted: (m: boolean) => void
}

// SSR/非ブラウザ環境ガード
const hasDOM = typeof window !== 'undefined' && typeof Audio !== 'undefined'

let muted = false
let bgm: HTMLAudioElement | null = null
let bgmArmed = false
const bases: Partial<Record<SfxName, HTMLAudioElement>> = {}

const debug: AudioDebug = {
  coin: 0,
  jump: 0,
  land: 0,
  clear: 0,
  ui: 0,
  splash: 0,
  checkpoint: 0,
  bgmStarted: false,
  muted: false,
  toggleMute: () => setMuted(!muted),
  setMuted: (m: boolean) => setMuted(m),
}

function setMuted(m: boolean): boolean {
  muted = m
  debug.muted = m
  if (bgm) bgm.muted = m
  return m
}

function preload() {
  if (!hasDOM) return
  ;(Object.keys(SFX_SRC) as SfxName[]).forEach((name) => {
    if (bases[name]) return
    const a = new Audio(SFX_SRC[name])
    a.preload = 'auto'
    bases[name] = a
  })
  if (!bgm) {
    bgm = new Audio(BGM_SRC)
    bgm.loop = true
    bgm.volume = BGM_VOL
    bgm.preload = 'auto'
  }
}

// 反復疲れ対策：同じ効果音でも毎回すこしだけ音程を変える（±6%）。
// 幼児プレイは同じ動作を何百回も繰り返すので、耳が飽きないように。
const pitchJitter = () => 1 + (Math.random() * 2 - 1) * 0.06

// 効果音を鳴らす。重なって鳴らせるよう、その都度クローンして再生する。
// rate を渡すと再生速度＝ピッチを変える（コンボ音程などに使う）。
function playSfx(name: SfxName, opts?: { rate?: number }) {
  if (!hasDOM || muted) return
  const base = bases[name]
  if (!base) return
  try {
    const node = base.cloneNode(true) as HTMLAudioElement
    node.volume = Number(SFX_VOL[name])
    const rate = opts?.rate && opts.rate > 0 ? opts.rate : 1
    node.playbackRate = rate * pitchJitter()
    void node.play().catch(() => {})
  } catch {
    /* ignore */
  }
  debug[name] += 1
}

// コインは連続取得で半音ずつ上げてコンボ感を出す（semitones=段数）。
export const playCoin = (semitones = 0) => playSfx('coin', { rate: Math.pow(2, semitones / 12) })
export const playJump = () => playSfx('jump')
export const playLand = () => playSfx('land')
export const playClear = () => playSfx('clear')

// BGM を開始（ユーザー操作後に呼ばれる前提）
function startBgm() {
  if (!hasDOM || !bgm || debug.bgmStarted) return
  bgm.muted = muted
  bgm
    .play()
    .then(() => {
      debug.bgmStarted = true
    })
    .catch(() => {
      // まだ操作前などで弾かれたら、次の操作で再トライ
    })
}

// 最初のユーザー操作で BGM を開始する（一度だけ仕込む）
function armBgmOnFirstGesture() {
  if (!hasDOM || bgmArmed) return
  bgmArmed = true
  const onGesture = () => {
    startBgm()
    if (debug.bgmStarted) removeListeners()
  }
  const removeListeners = () => {
    window.removeEventListener('keydown', onGesture)
    window.removeEventListener('pointerdown', onGesture)
    window.removeEventListener('touchstart', onGesture)
  }
  window.addEventListener('keydown', onGesture)
  window.addEventListener('pointerdown', onGesture)
  window.addEventListener('touchstart', onGesture)
}

// ---- クリア演出について ----
// 旧実装は「コインを total 回ひろったら」でファンファーレを鳴らしていたが、
// コインは 5 秒で無限復活するため“同じコインの拾い直し”でも回数が積み上がり、
// 全 74 枚を集めた意味にならないまま誤発火していた。この検出ロジックは撤去。
// クリア演出は今後ゴール旗への到達（ロードマップ[B]）に紐付け直す。playClear() は温存。

// ===== UI/ビルド操作の効果音（Web Audio で合成。音源ファイル不要）=====
type UiSound = 'buy' | 'place' | 'pickup' | 'undo' | 'delete' | 'rotate' | 'nope'

let actx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (!hasDOM) return null
  try {
    if (!actx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      actx = new AC()
    }
    if (actx.state === 'suspended') void actx.resume()
    return actx
  } catch {
    return null
  }
}

interface ToneOpts {
  type?: OscillatorType
  from: number
  to?: number
  dur: number
  gain?: number
  delay?: number
}
function tone(ctx: AudioContext, o: ToneOpts) {
  const t0 = ctx.currentTime + (o.delay ?? 0)
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = o.type ?? 'sine'
  const j = pitchJitter() // 合成音も毎回すこし音程を揺らす（反復疲れ対策）
  osc.frequency.setValueAtTime(o.from * j, t0)
  if (o.to && o.to !== o.from) osc.frequency.exponentialRampToValueAtTime(o.to * j, t0 + o.dur)
  const peak = o.gain ?? 0.18
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + o.dur + 0.03)
}

function playUi(name: UiSound) {
  if (muted) return
  const ctx = getCtx()
  if (!ctx) return
  switch (name) {
    case 'buy':
      tone(ctx, { type: 'triangle', from: 740, to: 990, dur: 0.12, gain: 0.16 })
      tone(ctx, { type: 'triangle', from: 990, to: 1320, dur: 0.14, gain: 0.14, delay: 0.09 })
      break
    case 'place':
      tone(ctx, { type: 'sine', from: 520, to: 300, dur: 0.14, gain: 0.2 })
      break
    case 'pickup':
      tone(ctx, { type: 'sine', from: 330, to: 620, dur: 0.12, gain: 0.16 })
      break
    case 'undo':
      tone(ctx, { type: 'sine', from: 640, to: 320, dur: 0.16, gain: 0.16 })
      break
    case 'delete':
      tone(ctx, { type: 'triangle', from: 420, to: 140, dur: 0.18, gain: 0.18 })
      break
    case 'rotate':
      tone(ctx, { type: 'square', from: 600, dur: 0.05, gain: 0.08 })
      tone(ctx, { type: 'square', from: 820, dur: 0.05, gain: 0.08, delay: 0.06 })
      break
    case 'nope':
      tone(ctx, { type: 'square', from: 200, dur: 0.08, gain: 0.07 })
      tone(ctx, { type: 'square', from: 170, dur: 0.1, gain: 0.07, delay: 0.1 })
      break
  }
  debug.ui += 1
}

// ===== 水しぶき（バシャーン）=====
// ノイズ（音源ファイル不要）を低域フィルタで「シュワッ」と開閉させて水音にする。
// big=true（滑り台から勢いよく着水）は大きく低く、small は小さく。
let noiseBuf: AudioBuffer | null = null
function getNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf
  const len = Math.floor(ctx.sampleRate * 0.5)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  noiseBuf = buf
  return buf
}

export function playSplash(big = false) {
  if (muted) return
  const ctx = getCtx()
  if (!ctx) return
  const t0 = ctx.currentTime
  const dur = big ? 0.45 : 0.28
  // ノイズ＝水のはじける音
  const src = ctx.createBufferSource()
  src.buffer = getNoise(ctx)
  const filt = ctx.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.setValueAtTime(big ? 3400 : 2200, t0)
  filt.frequency.exponentialRampToValueAtTime(380, t0 + dur)
  const g = ctx.createGain()
  const peak = big ? 0.3 : 0.16
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filt).connect(g).connect(ctx.destination)
  src.start(t0)
  src.stop(t0 + dur + 0.05)
  // かわいい「ボチャン」の音程感を少し足す
  tone(ctx, { type: 'sine', from: big ? 520 : 720, to: big ? 190 : 360, dur: big ? 0.22 : 0.13, gain: 0.12 })
  debug.splash += 1
}

// チェックポイント到達＝明るい上昇チャイム（ピコーン）。
export function playCheckpoint() {
  if (muted) return
  const ctx = getCtx()
  if (!ctx) return
  tone(ctx, { type: 'triangle', from: 660, to: 990, dur: 0.14, gain: 0.16 })
  tone(ctx, { type: 'triangle', from: 990, to: 1320, dur: 0.16, gain: 0.13, delay: 0.1 })
  debug.checkpoint += 1
}

// 復帰＝やわらかい「ふわっ」（罰っぽくならない優しい音）。
export function playRespawn() {
  if (muted) return
  const ctx = getCtx()
  if (!ctx) return
  tone(ctx, { type: 'sine', from: 480, to: 860, dur: 0.2, gain: 0.15 })
  debug.checkpoint += 1
}

// エモート＝あかるい2音のポップ（押した瞬間のフィードバック）。
export function playEmote() {
  if (muted) return
  const ctx = getCtx()
  if (!ctx) return
  tone(ctx, { type: 'triangle', from: 660, to: 880, dur: 0.09, gain: 0.12 })
  tone(ctx, { type: 'triangle', from: 880, to: 1180, dur: 0.12, gain: 0.1, delay: 0.07 })
  debug.ui += 1
}

export const playBuy = () => playUi('buy')
export const playPlace = () => playUi('place')
export const playPickup = () => playUi('pickup')
export const playUndo = () => playUi('undo')
export const playDelete = () => playUi('delete')
export const playRotate = () => playUi('rotate')
export const playNope = () => playUi('nope')

// 初期化（最初の import 時に1回）
if (hasDOM) {
  preload()
  armBgmOnFirstGesture()
  ;(window as unknown as { __audio?: AudioDebug }).__audio = debug
}
