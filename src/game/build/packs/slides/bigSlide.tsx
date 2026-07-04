import { createSlideItem } from './slideKit'

// きょだいスライダー — いちばん高い台から滑り降りる特大スライダー（サニーオレンジ）。
// 共有キット（まるっこいトイ型）で生成。CELL=4 前提で H=0.7(≒2.8m)・footprint[4,1]（小さめ最適化）。
// 登り階段 → スタートゲートつき台 → つるつるの滑走面 → 着水プール。
export const bigSlideItem = createSlideItem({
  id: 'big-slide',
  name: 'きょだいスライダー',
  emoji: '🛝',
  price: 12,
  footprint: [4, 1],
  H: 0.7,
  lanes: 1,
  palette: {
    climb: '#ff9f43',
    platform: '#ff5a52',
    slide: '#ffd23f',
    wall: '#ff7a59',
    accent: '#ffe36e',
  },
})
