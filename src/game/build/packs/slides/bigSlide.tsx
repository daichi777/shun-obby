import { createSlideItem } from './slideKit'

// きょだいスライダー — いちばん高い台から滑り降りる特大スライダー（サニーオレンジ）。
// 共有キット（螺旋階段タイプ）で生成。CELL=4 前提で H=1.4(≒5.6m)・footprint[2,1]。
// 螺旋でコンパクトに登る → 高い台 → 急な滑走面 → 着水プール。いちばん高いスライダー。
export const bigSlideItem = createSlideItem({
  id: 'big-slide',
  name: 'きょだいスライダー',
  emoji: '🛝',
  price: 12,
  footprint: [2, 1],
  H: 1.4,
  lanes: 1,
  palette: {
    climb: '#ff9f43',
    platform: '#ff5a52',
    slide: '#ffd23f',
    wall: '#ff7a59',
    accent: '#ffe36e',
  },
})
