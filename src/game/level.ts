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

// コインの配置。広場全体にたくさん散らして「すぐ集められる」ように。
// 各アスレチックエリア（4隅）の足場ぞいのコインは、各 Area コンポーネント側で配置する。
const COIN_Y = 1.0
// 中央(噴水)を中心に同心円リングで全方位へばらまくヘルパー
const coinRing = (r: number, n: number, phase = 0): Vec3[] =>
  Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2
    return [Math.round(Math.cos(a) * r), COIN_Y, Math.round(Math.sin(a) * r)] as Vec3
  })

export const COINS: Vec3[] = [
  // 広場のすぐそば（歩き出してすぐ集まる）
  [4, COIN_Y, 4],
  [-4, COIN_Y, 4],
  [4, COIN_Y, -4],
  [-4, COIN_Y, -4],
  // 同心円リングで全方位に大量配置
  ...coinRing(14, 12),
  ...coinRing(28, 16, 0.2),
  ...coinRing(44, 18, 0.1),
  ...coinRing(62, 18, 0.25),
  // 既存 obby／スライダーの足場ぞい（+x,+z。登りながら集める）
  ...(
    [
      [5, 2.5, 0],
      [9, 3.5, 0],
      [13, 4.5, 0],
      [15.5, 3.2, 0],
      [17.5, 2.0, 0],
      [20.5, 1.2, 0],
    ] as Vec3[]
  ).map((p) => shift(p)),
]
