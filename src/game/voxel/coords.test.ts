import { describe, it, expect } from 'vitest'
import {
  worldToChunkX,
  worldToChunkZ,
  worldToLocalX,
  worldToLocalY,
  worldToLocalZ,
  worldToSectionY,
  chunkOriginX,
  localIndex,
  lightIndex,
  worldPointToBlock,
} from './coords'
import { SECTION_VOL, SECTION } from './constants'

describe('coords: world -> chunk', () => {
  it('正座標', () => {
    expect(worldToChunkX(0)).toBe(0)
    expect(worldToChunkX(15)).toBe(0)
    expect(worldToChunkX(16)).toBe(1)
    expect(worldToChunkX(31)).toBe(1)
    expect(worldToChunkX(32)).toBe(2)
    expect(worldToChunkZ(16)).toBe(1)
  })
  it('負座標（2の補数で正しく）', () => {
    expect(worldToChunkX(-1)).toBe(-1)
    expect(worldToChunkX(-16)).toBe(-1)
    expect(worldToChunkX(-17)).toBe(-2)
  })
})

describe('coords: world -> local（0..15）', () => {
  it('境界 0/15/16/-1 を網羅', () => {
    expect(worldToLocalX(0)).toBe(0)
    expect(worldToLocalX(15)).toBe(15)
    expect(worldToLocalX(16)).toBe(0)
    expect(worldToLocalX(-1)).toBe(15)
    expect(worldToLocalZ(-1)).toBe(15)
    expect(worldToLocalY(-1)).toBe(15)
    expect(worldToLocalY(16)).toBe(0)
  })
})

describe('coords: 往復変換は全整数で一致', () => {
  it('x = chunkOrigin(chunkX(x)) + localX(x)', () => {
    for (let x = -40; x <= 40; x++) {
      expect(chunkOriginX(worldToChunkX(x)) + worldToLocalX(x)).toBe(x)
    }
  })
  it('section と local Y の合成', () => {
    for (let y = 0; y <= 63; y++) {
      expect(worldToSectionY(y) * SECTION + worldToLocalY(y)).toBe(y)
    }
  })
})

describe('coords: index レイアウト', () => {
  it('localIndex は 0..4095 に収まり一意', () => {
    const seen = new Set<number>()
    for (let y = 0; y < SECTION; y++)
      for (let z = 0; z < SECTION; z++)
        for (let x = 0; x < SECTION; x++) {
          const i = localIndex(x, y, z)
          expect(i).toBeGreaterThanOrEqual(0)
          expect(i).toBeLessThan(SECTION_VOL)
          expect(seen.has(i)).toBe(false)
          seen.add(i)
        }
    expect(seen.size).toBe(SECTION_VOL)
  })
  it('lightIndex も 0..4095 に収まり一意', () => {
    const seen = new Set<number>()
    for (let y = 0; y < SECTION; y++)
      for (let z = 0; z < SECTION; z++)
        for (let x = 0; x < SECTION; x++) {
          const i = lightIndex(x, y, z)
          expect(i).toBeGreaterThanOrEqual(0)
          expect(i).toBeLessThan(SECTION_VOL)
          seen.add(i)
        }
    expect(seen.size).toBe(SECTION_VOL)
  })
})

describe('coords: worldPointToBlock（floor）', () => {
  it('連続座標を含むブロックへ', () => {
    expect(worldPointToBlock(0.0)).toBe(0)
    expect(worldPointToBlock(0.9)).toBe(0)
    expect(worldPointToBlock(1.0)).toBe(1)
    expect(worldPointToBlock(-0.1)).toBe(-1)
    expect(worldPointToBlock(-1.0)).toBe(-1)
  })
})
