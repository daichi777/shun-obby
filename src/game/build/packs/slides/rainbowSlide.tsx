import { createSlideItem } from './slideKit'

// にじいろスライダー — 7.5m の高い台から、虹色の滑走面を滑り降りる。
// 共有キット（高い塔型・rainbow=true）で生成。滑走面に虹の縞（見た目だけ）を重ねる。
export const rainbowSlideItem = createSlideItem({
  id: 'niji-slide',
  name: 'にじいろスライダー',
  emoji: '🌈',
  price: 14,
  footprint: [4, 2],
  H: 0.75, // 7.5m
  lanes: 1,
  rainbow: true,
  palette: {
    climb: '#ff5a5a',
    platform: '#9b59ff',
    slide: '#f5f5f5',
    wall: '#ffffff',
    accent: '#ffd60a',
  },
})
