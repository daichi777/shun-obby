// エモートの合図（celebrateSignal と同じ、再レンダーを起こさないプレーンモジュール）。
// EmoteWheel（DOM）が trigger し、CharacterModel（Canvas内）が毎フレーム current を読む。
export type EmoteKind = 'wave' | 'banzai' | 'dance' | 'heart'

export const EMOTE_DURATION_MS = 2600

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0)

let active: EmoteKind | null = null
let until = 0

export function triggerEmote(kind: EmoteKind, durMs: number = EMOTE_DURATION_MS) {
  active = kind
  until = now() + durMs
}

export function currentEmote(): EmoteKind | null {
  return active && now() < until ? active : null
}

export function clearEmote() {
  active = null
  until = 0
}
