// コース（ステージ）のデータ。プラットフォーム・スライダー・コインの配置をここで定義。
// 数値を変えるだけでレベルデザインを調整できる。
//
// === 広場（公園）レイアウト ===
//   ・地面は 200x200 のとても広い芝生（中心 原点）。x,z ともに約 ±100。
//   ・中央（原点）に噴水広場。まわりに石だたみの小道（十字）と並木・ベンチ・街灯。→ Environment.tsx
//   ・obby（階段あしば）＋大きなスライダーは北東の一角（x:+, z:+ あたり）に移設。
//     OBBY_OFFSET で相対形状ごと平行移動しているので、スライダーの物理はそのまま。
//   ・西〜南西のひらけた区画（おおよそ x<-8）は「おみせ・屋台」用に空けてある（別機能で使用）。

export type Vec3 = [number, number, number]

export interface Box {
  position: Vec3 // 中心
  size: Vec3 // 幅・高さ・奥行き
  color: string
}

// 地面（とても広い芝生の広場）
export const GROUND: Box = {
  position: [0, -0.5, 0],
  size: [200, 1, 200],
  color: '#7ec850',
}

// obby 一式をまとめて北東へずらすオフセット（相対形状は保つ）
const OBBY_OFFSET: Vec3 = [7, 0, 12]
const shift = (p: Vec3): Vec3 => [p[0] + OBBY_OFFSET[0], p[1] + OBBY_OFFSET[1], p[2] + OBBY_OFFSET[2]]

// 階段状のあしば（だんだん高くなる小さな obby）
export const PLATFORMS: Box[] = [
  { position: shift([5, 0.75, 0]), size: [3, 1.5, 3], color: '#ff8fab' },
  { position: shift([9, 1.75, 0]), size: [3, 1.5, 3], color: '#ffd166' },
  { position: shift([13, 2.75, 0]), size: [4.5, 1.5, 4.5], color: '#9b5de5' }, // 上のひろば
]

// 大きなスライダー（すべりだい）: 上のひろば(上面 3.5) から 地面へ
export interface Slide {
  position: Vec3 // 中心
  size: Vec3 // [ながさ, あつみ, はば]
  rotationZ: number // かたむき(ラジアン)
  color: string
}
export const SLIDE: Slide = {
  position: shift([16.4, 1.7, 0]),
  size: [7, 0.5, 3.2],
  // 約35.5度。ecctrl の slopeMaxAngle(0.5rad≒28.6度)より明確に急にして、
  // 「乗ると自動で滑り降りる」（＝坂上では非接地扱い→重力＋低摩擦で滑走）を確実にする。
  rotationZ: -0.62,
  color: '#4cc9f0',
}

// コインの配置。広場の小道ぞい＋obby／スライダーぞい。サーフェスより約1.0上に浮かせる。
export const COINS: Vec3[] = [
  // 中央広場の小道ぞい（さんぽしながら集められる）
  [0, 1.0, -3],
  [-6, 1.0, 0],
  [0, 1.0, 6],
  [8, 1.0, 0],
  [-11, 1.0, -9],
  // あしばの上（obby、北東に移設）
  ...[
    [5, 2.5, 0],
    [9, 3.5, 0],
    [13, 4.5, 0],
  ].map((p) => shift(p as Vec3)),
  // スライダーぞい＋着地点
  ...[
    [15.5, 3.2, 0],
    [17.5, 2.0, 0],
    [20.5, 1.2, 0],
  ].map((p) => shift(p as Vec3)),
]
