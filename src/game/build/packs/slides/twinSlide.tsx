import { createSlideItem } from './slideKit'

// ツインスライダー — 高い台から2本のレーンで滑り降りる（レース風・アクアブルー）。
// 共有キット（螺旋階段タイプ・lanes=2）で生成。CELL=4 前提で H=1.1(≒4.4m)・footprint[2,2]。
// 螺旋の登り・台・プールは共通、滑走面だけ2レーン（レーンBは少し明るい）。
export const twinSlideItem = createSlideItem({
  id: 'twin-slide',
  name: 'ツインスライダー',
  emoji: '🛝',
  price: 10,
  footprint: [2, 2],
  H: 1.1,
  lanes: 2,
  palette: {
    climb: '#5ec8ff',
    platform: '#2f8fff',
    slide: '#3ad0e0',
    wall: '#eaf6ff',
    accent: '#ffd23f',
  },
})
