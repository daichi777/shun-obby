// 1チャンク = 16(x) × WORLD_HEIGHT(y) × 16(z)。垂直に SECTIONS_Y 個の Section を持つ。
// Section は遅延確保（必要になるまで null）。Three 非依存。

import { SECTIONS_Y } from './constants'
import { worldToSectionY, worldToLocalY } from './coords'
import { Section } from './Section'
import { AIR, type BlockId } from './blocks'

export class Chunk {
  readonly cx: number
  readonly cz: number
  readonly sections: (Section | null)[] = new Array(SECTIONS_Y).fill(null)
  // メッシュ再生成が必要か（VoxelWorld が立てる／ChunkMeshManager が降ろす）
  meshDirty = true

  constructor(cx: number, cz: number) {
    this.cx = cx
    this.cz = cz
  }

  getBlock(lx: number, y: number, lz: number): BlockId {
    const sy = worldToSectionY(y)
    if (sy < 0 || sy >= SECTIONS_Y) return AIR
    const sec = this.sections[sy]
    if (sec === null) return AIR
    return sec.get(lx, worldToLocalY(y), lz)
  }

  // 変更があったら true。
  setBlock(lx: number, y: number, lz: number, id: BlockId): boolean {
    const sy = worldToSectionY(y)
    if (sy < 0 || sy >= SECTIONS_Y) return false
    let sec = this.sections[sy]
    if (sec === null) {
      if (id === AIR) return false // 空セクションに AIR を置いても無変化
      sec = new Section()
      this.sections[sy] = sec
    }
    const changed = sec.set(lx, worldToLocalY(y), lz, id)
    if (changed) this.meshDirty = true
    return changed
  }

  // 非 AIR ブロック総数
  nonAirCount(): number {
    let n = 0
    for (const s of this.sections) if (s) n += s.nonAirCount
    return n
  }

  // 確保済み（非null）セクション数
  liveSectionCount(): number {
    let n = 0
    for (const s of this.sections) if (s) n++
    return n
  }
}
