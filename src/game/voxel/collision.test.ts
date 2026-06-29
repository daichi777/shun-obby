import { describe, it, expect } from 'vitest'
import { moveAndCollide, type Body, type SolidQuery } from './collision'

// y<=0 を全面 solid（床）とするスタブ世界
const flatFloor: SolidQuery = { isSolid: (_x, y, _z) => y <= 0 }

// 床 y<=0 に加えて x>=2 の列が y<=1 まで solid（高さ1の段差）
const stepWorld: SolidQuery = { isSolid: (x, y, _z) => y <= 0 || (x >= 2 && y <= 1) }

describe('collision: 落下して床に着地', () => {
  it('上空から落ちると足元が y=1（床上面）で止まる', () => {
    const body: Body = { x: 0.5, y: 5, z: 0.5, vy: -10, onGround: false }
    for (let i = 0; i < 60; i++) moveAndCollide(flatFloor, body, 0, 0, -0.2)
    expect(body.y).toBeCloseTo(1, 5)
    expect(body.onGround).toBe(true)
    expect(body.vy).toBe(0)
  })
})

describe('collision: 壁/段差', () => {
  it('接地中に高さ1の段差へ前進すると自動で登れる', () => {
    const body: Body = { x: 0.5, y: 1, z: 0.5, vy: 0, onGround: true }
    // 段差(x>=2)へ向かって前進しつつ重力で settle
    for (let i = 0; i < 120; i++) moveAndCollide(stepWorld, body, 0.05, 0, -0.2)
    expect(body.x).toBeGreaterThan(2) // 段差の上へ乗り越えた
    expect(body.y).toBeCloseTo(2, 5) // 段(高さ1ブロック=上面y=2)に着地
    expect(body.onGround).toBe(true)
  })
})

describe('collision: 天井', () => {
  it('上昇で頭をぶつけると止まる', () => {
    // y=4 を天井にする世界
    const ceiling: SolidQuery = { isSolid: (_x, y) => y <= 0 || y >= 4 }
    const body: Body = { x: 0.5, y: 1, z: 0.5, vy: 5, onGround: true }
    moveAndCollide(ceiling, body, 0, 0, 3) // 一気に上へ
    // 頭(y+1.62)が天井(y=4)を超えない
    expect(body.y + 1.62).toBeLessThanOrEqual(4 + 1e-6)
    expect(body.vy).toBe(0)
  })
})
