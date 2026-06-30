import { createSlideItem } from './slideKit'

// きょだいスライダー — いちばん高い 8m の塔から滑り降りる特大スライダー。
// 共有キット（高い塔型）で生成。歩いて登る長い坂 → 高い台 → 急な滑走面 → 着地プール。
export const bigSlideItem = createSlideItem({
  id: 'big-slide',
  name: 'きょだいスライダー',
  emoji: '🛝',
  price: 12,
  footprint: [4, 2],
  H: 0.8, // 8m
  lanes: 1,
  palette: {
    climb: '#ff8a3d',
    platform: '#ff3b3b',
    slide: '#ffd11a',
    wall: '#ff3b3b',
    accent: '#ffd11a',
  },
})
