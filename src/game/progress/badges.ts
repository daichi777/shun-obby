// エリアクリアで手に入る「バッジ」の定義（ずかんのバッジ棚に並ぶ）。
// area は GoalFlag の area プロパティと一致させること。
export interface BadgeDef {
  area: string
  label: string
  emoji: string
  color: string
}

export const BADGES: BadgeDef[] = [
  { area: 'sky', label: 'そらの しま', emoji: '🏝️', color: '#ab47bc' },
  { area: 'tightrope', label: 'つなわたり', emoji: '🎪', color: '#ab47bc' },
  { area: 'bridges', label: 'つりばし', emoji: '🧗', color: '#ffca28' },
]
