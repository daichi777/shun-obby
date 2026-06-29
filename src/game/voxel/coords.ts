// 座標系の相互変換（world <-> chunk <-> section <-> local）。
// すべて純関数・ビット演算で、負座標も 2 の補数（>> / &）で正しく回る。
// 例: worldToChunkX(-1) === -1 / worldToLocalX(-1) === 15

import { SECTION_BITS, SECTION_MASK, SECTION } from './constants'

// --- world ブロック座標 -> チャンク座標 ---
export function worldToChunkX(x: number): number {
  return x >> SECTION_BITS
}
export function worldToChunkZ(z: number): number {
  return z >> SECTION_BITS
}

// --- world ブロック座標 -> セクション内ローカル（0..15）---
export function worldToLocalX(x: number): number {
  return x & SECTION_MASK
}
export function worldToLocalZ(z: number): number {
  return z & SECTION_MASK
}
export function worldToLocalY(y: number): number {
  return y & SECTION_MASK
}

// --- world Y -> 垂直セクションindex（0..SECTIONS_Y-1 想定）---
export function worldToSectionY(y: number): number {
  return y >> SECTION_BITS
}

// --- チャンク座標 -> そのチャンク原点の world ブロック座標 ---
export function chunkOriginX(cx: number): number {
  return cx << SECTION_BITS
}
export function chunkOriginZ(cz: number): number {
  return cz << SECTION_BITS
}

// --- セクション内ローカル(0..15) -> indices 配列の添字 ---
// レイアウト規約: (y<<8) | (z<<4) | x  （x が最下位＝メモリ連続）
export function localIndex(lx: number, ly: number, lz: number): number {
  return (ly << 8) | (lz << SECTION_BITS) | lx
}

// --- light 配列の添字（indices と同レイアウト）---
export function lightIndex(lx: number, ly: number, lz: number): number {
  return ((ly & SECTION_MASK) * SECTION + (lz & SECTION_MASK)) * SECTION + (lx & SECTION_MASK)
}

// --- チャンクキー（Map のキー）---
export function chunkKey(cx: number, cz: number): string {
  return cx + ',' + cz
}

// --- ブロック整数座標 -> その中心の world 座標（描画/レイ用・+0.5）---
export function blockCenterX(x: number): number {
  return x + 0.5
}
export function blockCenterY(y: number): number {
  return y + 0.5
}
export function blockCenterZ(z: number): number {
  return z + 0.5
}

// --- world 連続座標 -> 含まれるブロック整数座標（floor）---
export function worldPointToBlock(v: number): number {
  return Math.floor(v)
}
