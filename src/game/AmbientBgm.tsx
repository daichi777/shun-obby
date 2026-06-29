import { useEffect } from 'react'

// 生成型アンビエント・ピアノ BGM（Minecraft 風のしずかな世界にあう、リラックスした音）。
//   ・Web Audio で合成。音源ファイル不要・ライセンス不要・即反映。
//   ・C メジャー・ペンタトニックなので不協和音にならず、いつ聴いても心地よい。
//   ・音をまばらに鳴らし続ける「生成型」なので、ループの繰り返し感がなく、
//     長く流しても疲れない（テンポゆっくり・音数すくなめ）。
//   ・AudioContext は「ユーザー操作」が要るので、最初のクリック／キー／タッチで開始する。
//
// 音量や雰囲気はこのファイルの定数で調整できる。
// 将来 higgsfield などで録音音源にさし替えたくなったら、ここを差し替えるだけ。

type WindowWithBgm = {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
  __bgm?: {
    started: boolean
    notes: number
    setVolume: (v: number) => void
    stop: () => void
  }
}

// C メジャー・ペンタトニック（半音オフセット）と基準音 C3
const SCALE = [0, 2, 4, 7, 9]
const ROOT = 130.81 // C3 (Hz)
// オクターブずらし(octOff)と音階インデックス(degIdx)から周波数を出す
const freqOf = (octOff: number, degIdx: number) =>
  ROOT * Math.pow(2, octOff + SCALE[degIdx] / 12)

export function AmbientBgm({ volume = 0.14 }: { volume?: number }) {
  useEffect(() => {
    const w = window as unknown as WindowWithBgm
    let ctx: AudioContext | null = null
    let master: GainNode | null = null
    let reverbIn: ConvolverNode | null = null
    let timer: number | null = null
    let stopped = false
    let notes = 0

    // やわらかい余韻（簡易リバーブ）用のインパルスを生成
    const makeReverb = (c: AudioContext): ConvolverNode => {
      const len = Math.floor(c.sampleRate * 2.4)
      const buf = c.createBuffer(2, len, c.sampleRate)
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch)
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
        }
      }
      const cv = c.createConvolver()
      cv.buffer = buf
      return cv
    }

    // ピアノっぽいやわらかい1音（三角波＋1オクターブ上のサイン、ローパスで丸く）
    const voice = (c: AudioContext, freq: number, t: number, dur: number, vel: number) => {
      const env = c.createGain()
      env.gain.setValueAtTime(0.0001, t)
      env.gain.exponentialRampToValueAtTime(vel, t + 0.02) // やわらかいアタック
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur) // 長い減衰
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 2100
      lp.Q.value = 0.2
      const o1 = c.createOscillator()
      o1.type = 'triangle'
      o1.frequency.value = freq
      const o2 = c.createOscillator()
      o2.type = 'sine'
      o2.frequency.value = freq * 2
      const o2g = c.createGain()
      o2g.gain.value = 0.16
      o1.connect(env)
      o2.connect(o2g).connect(env)
      env.connect(lp)
      if (master) lp.connect(master) // ドライ
      if (reverbIn) lp.connect(reverbIn) // ウェット送り
      o1.start(t)
      o2.start(t)
      const end = t + dur + 0.2
      o1.stop(end)
      o2.stop(end)
    }

    const step = () => {
      if (stopped || !ctx || !master) return
      const t = ctx.currentTime + 0.05
      const r = Math.random()
      if (r < 0.16) {
        // たまに低めのルート／5度（あたたかいベース）を長めに
        const deg = Math.random() < 0.5 ? 0 : 3
        voice(ctx, freqOf(-1, deg), t, 4.6, 0.5)
      } else {
        // 中音のメロディを1音
        const oct = Math.random() < 0.7 ? 0 : 1
        const deg = Math.floor(Math.random() * SCALE.length)
        voice(ctx, freqOf(oct, deg), t, 3.0, 0.62)
        notes++
        if (w.__bgm) w.__bgm.notes = notes
        // ときどきハモり（となりの音階）
        if (Math.random() < 0.25) {
          const deg2 = (deg + 2) % SCALE.length
          voice(ctx, freqOf(oct, deg2), t + 0.04, 2.6, 0.4)
        }
      }
      // 次の音まで 1.7〜3.5 秒（ゆっくり・まばら）
      timer = window.setTimeout(step, 1700 + Math.random() * 1800)
    }

    const stop = () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
      removeArm()
      if (ctx) {
        void ctx.close()
        ctx = null
      }
      if (w.__bgm) w.__bgm.started = false
    }

    const start = () => {
      if (ctx || stopped) return
      const AC = w.AudioContext || w.webkitAudioContext
      if (!AC) return
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = volume
      master.connect(ctx.destination)
      reverbIn = makeReverb(ctx)
      const revGain = ctx.createGain()
      revGain.gain.value = 0.32
      reverbIn.connect(revGain).connect(ctx.destination)
      void ctx.resume()
      w.__bgm = {
        started: true,
        notes,
        setVolume: (v: number) => {
          if (master) master.gain.value = v
        },
        stop,
      }
      step()
      removeArm()
    }

    const removeArm = () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      window.removeEventListener('touchstart', start)
    }

    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    window.addEventListener('touchstart', start)

    return stop
  }, [volume])

  return null
}
