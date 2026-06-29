import { describe, it, expect } from 'vitest'
import { VoxelWorld } from './VoxelWorld'
import { attachLight, initLight } from './light'
import { BLOCK } from './blocks'

// 平らな床（y=0..3 を stone で満たす）だけの小世界を作り、light を張る。
function makeWorld(): VoxelWorld {
  const w = new VoxelWorld()
  for (let x = 20; x < 40; x++) {
    for (let z = 20; z < 40; z++) {
      for (let y = 0; y <= 3; y++) w.setBlock(x, y, z, BLOCK.STONE, true)
    }
  }
  initLight(w)
  attachLight(w)
  return w
}

describe('light: sky light', () => {
  it('地表より上の空気は sky=15、床の中は 0', () => {
    const w = makeWorld()
    expect(w.getSkyLight(30, 10, 30)).toBe(15) // 上空
    expect(w.getSkyLight(30, 4, 30)).toBe(15) // 床のすぐ上
    expect(w.getSkyLight(30, 2, 30)).toBe(0) // 床の中（不透明）
  })

  it('屋根を架けると真下の sky が落ちる、撤去で完全復帰（remove伝播の最難所）', () => {
    const w = makeWorld()
    const x = 30
    const z = 30
    // 床の上(y=4)に立方体の空洞を作るため、まず y=4..6 を空けて y=7 に屋根
    // ここでは単純化: y=8 に屋根1枚を置き、その直下 y=7 が暗くなることを確認
    expect(w.getSkyLight(x, 7, z)).toBe(15)
    w.setBlock(x, 8, z, BLOCK.STONE)
    // 屋根の真下は直射(15)が遮られる。周囲から回り込むので 15 未満になるはず
    expect(w.getSkyLight(x, 7, z)).toBeLessThan(15)
    // 撤去すると元の 15 に完全復帰
    w.setBlock(x, 8, z, BLOCK.AIR)
    expect(w.getSkyLight(x, 7, z)).toBe(15)
  })
})

describe('light: block light', () => {
  it('ライト設置で距離減衰 block==max(0,15-d)、撤去で 0 に完全復帰', () => {
    const w = makeWorld()
    const x = 30
    const y = 6
    const z = 30
    w.setBlock(x, y, z, BLOCK.LIGHT)
    expect(w.getBlockLight(x, y, z)).toBe(15)
    expect(w.getBlockLight(x + 1, y, z)).toBe(14)
    expect(w.getBlockLight(x + 3, y, z)).toBe(12)
    expect(w.getBlockLight(x + 5, y, z)).toBe(10)
    // 撤去で周囲が完全に 0 へ戻る（取り残しの明かりゼロ）
    w.setBlock(x, y, z, BLOCK.AIR)
    expect(w.getBlockLight(x, y, z)).toBe(0)
    expect(w.getBlockLight(x + 1, y, z)).toBe(0)
    expect(w.getBlockLight(x + 5, y, z)).toBe(0)
  })

  it('2つの光源があるとき片方を消しても、もう片方の寄与は残る', () => {
    const w = makeWorld()
    const y = 6
    w.setBlock(25, y, 30, BLOCK.LIGHT)
    w.setBlock(35, y, 30, BLOCK.LIGHT)
    const mid = w.getBlockLight(30, y, 30) // 両方から距離5 → 10
    expect(mid).toBe(10)
    // 片方を消す
    w.setBlock(25, y, 30, BLOCK.AIR)
    // 残った 35 の光源からの距離5 → 10 が中点に残る
    expect(w.getBlockLight(35, y, 30)).toBe(15)
    expect(w.getBlockLight(30, y, 30)).toBe(10)
    // 消した側の隣は残光なし方向だが、生きている光源からの伝播で 0 にはならない
    expect(w.getBlockLight(24, y, 30)).toBeGreaterThan(0)
  })
})
