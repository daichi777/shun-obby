// レベルアップ等の瞬間にキャラを一瞬「バンザイ」させるための軽量シグナル。
// zustand を使わない（＝再レンダーゼロ）ので CharacterModel の useFrame から毎フレーム読める。
export const celebrateSignal = { until: 0 }

export const triggerCelebratePose = (ms = 1400) => {
  celebrateSignal.until = (typeof performance !== 'undefined' ? performance.now() : 0) + ms
}

export const isCelebrating = () =>
  (typeof performance !== 'undefined' ? performance.now() : 0) < celebrateSignal.until
