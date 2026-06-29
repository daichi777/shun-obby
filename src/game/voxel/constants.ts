// voxel ワールドの固定寸法・定数（S0 で凍結）。
// 子供向けクリエイティブのスコープ簡略化は「このファイルの寸法のみ」で表現する。
// データ構造（パレット圧縮・16^3セクション・face culling）は本家どおり。

// --- セクション（16x16x16）---
export const SECTION = 16
export const SECTION_BITS = 4
export const SECTION_MASK = 15
export const SECTION_AREA = SECTION * SECTION // 256（1段ぶん）
export const SECTION_VOL = SECTION * SECTION * SECTION // 4096

// --- 固定ワールド寸法（子供向け：8x8チャンク・縦4セクション=64ブロック）---
export const WORLD_CHUNKS_X = 8
export const WORLD_CHUNKS_Z = 8
export const SECTIONS_Y = 4
export const WORLD_HEIGHT = SECTIONS_Y * SECTION // 64
export const WORLD_SIZE_X = WORLD_CHUNKS_X * SECTION // 128
export const WORLD_SIZE_Z = WORLD_CHUNKS_Z * SECTION // 128

// ワールド境界（ブロック座標・両端含む下限/上限）
export const WORLD_MIN_X = 0
export const WORLD_MIN_Z = 0
export const WORLD_MAX_X = WORLD_SIZE_X - 1 // 127
export const WORLD_MAX_Z = WORLD_SIZE_Z - 1 // 127
export const WORLD_MIN_Y = 0
export const WORLD_MAX_Y = WORLD_HEIGHT - 1 // 63

// 地形の基準海面（worldgen で使用）
export const SEA_LEVEL = 20

// レイキャスト到達距離（ブロック）
export const REACH = 7

// アンビエントオクルージョン（頂点AO・立体感のために有効）
export const ENABLE_AO = true

// 既定シード
export const DEFAULT_SEED = 1337
