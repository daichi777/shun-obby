// グリッドの吸着・占有セル計算。
// アンカー(ax,az)=アイテムが占める最小コーナーのセル。footprint[w,d]だけ占める。
//
// CELL = 1マスのワールド単位（＝アイテムの大きさ）。
//   ここを大きくすると、設置アイテムがその倍率で大きくなり、マスの間隔も同じだけ広がる
//   （重なりなし・スナップ整合）。見た目モデルの拡大は PlacementSystem 側で CELL を掛ける。
//   小さくしたい/大きくしたいときは、この数字だけ変えればOK。
export const CELL = 10

export type Cell = [number, number]
export type Footprint = [number, number]

// 設置できる範囲（ワールド単位。広場 GROUND 200x200 の内側・フェンス(±96)手前まで）。
// セル境界は CELL に応じて自動で増減する。±94 にすると CELL=10 で端のマス(中心±90)まで
// 置けて、アイテムのふちがフェンス直前(±95)に届く＝角・端までフルに設置できる。
export const BUILD_WORLD = { min: -94, max: 94 }

// 回転(rot=0..3 の90度きざみ)を反映した実効footprint。
// 90/270度では 幅と奥行きが入れかわる。
export function effFootprint(footprint: Footprint, rot: number): Footprint {
  return rot % 2 === 0 ? footprint : [footprint[1], footprint[0]]
}

// ポインターのワールド座標(px,pz)→ アイテムが中心に来るアンカーセル
export function snapToAnchor(px: number, pz: number, footprint: Footprint): Cell {
  const [w, d] = footprint
  return [Math.round(px / CELL - (w - 1) / 2), Math.round(pz / CELL - (d - 1) / 2)]
}

// アンカー＋footprint が占める全セル
export function cellsFor(anchor: Cell, footprint: Footprint): Cell[] {
  const [ax, az] = anchor
  const [w, d] = footprint
  const out: Cell[] = []
  for (let x = ax; x < ax + w; x++) {
    for (let z = az; z < az + d; z++) out.push([x, z])
  }
  return out
}

// アンカー＋footprint → 設置グループのワールド中心座標（CELL 倍で実ワールドへ）
export function groupCenter(anchor: Cell, footprint: Footprint): [number, number, number] {
  const [ax, az] = anchor
  const [w, d] = footprint
  return [(ax + w / 2 - 0.5) * CELL, 0, (az + d / 2 - 0.5) * CELL]
}

export function inBounds(cells: Cell[]): boolean {
  // 各占有セルの中心ワールド座標が広場の内側にあるか
  return cells.every(([x, z]) => {
    const wx = x * CELL
    const wz = z * CELL
    return wx >= BUILD_WORLD.min && wx <= BUILD_WORLD.max && wz >= BUILD_WORLD.min && wz <= BUILD_WORLD.max
  })
}

export const cellKey = (c: Cell): string => `${c[0]},${c[1]}`
