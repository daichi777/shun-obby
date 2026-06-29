// voxel ゲームの薄い状態層（zustand）。
// 重い権威データ（VoxelWorld 本体）はクラスインスタンスとして保持し、
// React 再描画のトリガには meshVersion カウンタを使う（インスタンスは set で作り直さない）。

import { create } from 'zustand'
import { VoxelWorld } from './VoxelWorld'
import { generateWorld } from './worldgen'
import { initLight, attachLight } from './light'
import { PLACEABLE_BLOCKS, BLOCK, type BlockId } from './blocks'

// 起動時に地形を生成済みのワールドを用意する（決定論）。
// 1) 地形生成（silent）→ 2) ライト一括計算 → 3) インクリメンタル更新フック登録。
function createWorld(): VoxelWorld {
  const w = new VoxelWorld()
  generateWorld(w)
  initLight(w)
  attachLight(w)
  return w
}

export type Tool = 'place' | 'break'

interface VoxelState {
  world: VoxelWorld
  selectedBlockId: BlockId
  hotbar: BlockId[]
  tool: Tool
  fly: boolean
  // メッシュ再生成を React 側へ通知するためのカウンタ
  meshVersion: number

  selectBlock: (id: BlockId) => void
  setTool: (t: Tool) => void
  toggleFly: () => void
  setFly: (on: boolean) => void
  bumpMesh: () => void
}

export const useVoxel = create<VoxelState>((set) => ({
  world: createWorld(),
  selectedBlockId: BLOCK.GRASS,
  hotbar: PLACEABLE_BLOCKS,
  tool: 'place',
  fly: false,
  meshVersion: 0,

  selectBlock: (id) => set({ selectedBlockId: id, tool: 'place' }),
  setTool: (t) => set({ tool: t }),
  toggleFly: () => set((s) => ({ fly: !s.fly })),
  setFly: (on) => set({ fly: on }),
  bumpMesh: () => set((s) => ({ meshVersion: s.meshVersion + 1 })),
}))
