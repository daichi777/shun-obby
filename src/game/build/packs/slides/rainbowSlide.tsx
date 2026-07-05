import { createSlideItem } from './slideKit'

// にじいろスライダー — 高い台から、虹色の滑走面を滑り降りる（グレープ＆レインボー）。
// 共有キット（螺旋階段タイプ・rainbow=true）で生成。CELL=4 前提で H=1.25(≒5.0m)・footprint[2,1]。
// 白い滑走面に虹の縞（見た目だけ）を重ねる。
export const rainbowSlideItem = createSlideItem({
  id: 'niji-slide',
  name: 'にじいろスライダー',
  emoji: '🌈',
  price: 14,
  footprint: [2, 1],
  H: 1.25,
  lanes: 1,
  rainbow: true,
  palette: {
    climb: '#ff6b9d',
    platform: '#9b6bff',
    slide: '#f6f6ff',
    wall: '#ffffff',
    accent: '#ffd23f',
  },
})
