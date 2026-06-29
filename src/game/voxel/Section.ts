// 16x16x16 セクション。パレット圧縮（本家どおり）で格納する。
// - palette: このセクションに出現する block id の集合（先頭は常に AIR=0）
// - indices: SECTION_VOL 個の palette 添字（Uint16Array）。全 AIR の間は null（メモリ節約）。
// Three 非依存（純TS）＝ユニットテスト可能。

import { SECTION_VOL } from './constants'
import { localIndex } from './coords'
import { AIR, type BlockId } from './blocks'

export class Section {
  // 先頭 0 番は AIR 予約。indices の 0 は AIR を指す。
  palette: BlockId[] = [AIR]
  // 全 AIR の間は null。最初の非 AIR set で確保する。
  indices: Uint16Array | null = null
  // 非 AIR ブロック数（空判定・統計用）
  nonAirCount = 0
  // ライティング（遅延確保）。0..15。
  blockLight: Uint8Array | null = null
  skyLight: Uint8Array | null = null

  get(lx: number, ly: number, lz: number): BlockId {
    if (this.indices === null) return AIR
    return this.palette[this.indices[localIndex(lx, ly, lz)]] ?? AIR
  }

  getBlockLight(lx: number, ly: number, lz: number): number {
    return this.blockLight ? this.blockLight[localIndex(lx, ly, lz)] : 0
  }
  setBlockLight(lx: number, ly: number, lz: number, v: number): void {
    if (!this.blockLight) this.blockLight = new Uint8Array(this.indices ? this.indices.length : 4096)
    this.blockLight[localIndex(lx, ly, lz)] = v
  }
  getSkyLight(lx: number, ly: number, lz: number): number {
    return this.skyLight ? this.skyLight[localIndex(lx, ly, lz)] : 0
  }
  setSkyLight(lx: number, ly: number, lz: number, v: number): void {
    if (!this.skyLight) this.skyLight = new Uint8Array(this.indices ? this.indices.length : 4096)
    this.skyLight[localIndex(lx, ly, lz)] = v
  }

  // 変更があったら true。
  set(lx: number, ly: number, lz: number, id: BlockId): boolean {
    if (this.indices === null) {
      if (id === AIR) return false // 既に全 AIR
      this.indices = new Uint16Array(SECTION_VOL) // 全 0 = AIR
    }
    const i = localIndex(lx, ly, lz)
    const prevPi = this.indices[i]
    const prevId = this.palette[prevPi] ?? AIR
    if (prevId === id) return false

    const pi = this.paletteIndexOf(id)
    this.indices[i] = pi

    if (prevId === AIR && id !== AIR) this.nonAirCount++
    else if (prevId !== AIR && id === AIR) this.nonAirCount--
    return true
  }

  isEmpty(): boolean {
    return this.nonAirCount === 0
  }

  // palette に id が無ければ追加して添字を返す。
  private paletteIndexOf(id: BlockId): number {
    const idx = this.palette.indexOf(id)
    if (idx >= 0) return idx
    this.palette.push(id)
    return this.palette.length - 1
  }
}
