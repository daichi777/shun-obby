import { createSlideItem } from './slideKit'

// ツインスライダー — 7m の高い台から、2本ならんだレーンで滑り降りる（レース風）。
// 共有キット（高い塔型・lanes=2）で生成。登り坂・台・プールは共通、滑走面だけ2レーン。
export const twinSlideItem = createSlideItem({
  id: 'twin-slide',
  name: 'ツインスライダー',
  emoji: '🛝',
  price: 10,
  footprint: [4, 2],
  H: 0.7, // 7m
  lanes: 2,
  palette: {
    climb: '#9fd8ff',
    platform: '#2979ff',
    slide: '#4cc9f0',
    wall: '#ffffff',
    accent: '#ffffff',
  },
})
