import { create } from 'zustand'
import type { Category } from '../game/build/itemTypes'

// 画面上部の大きな丸タブ（Roblox風）。各タブはショップのカテゴリに対応する。
//   スライド   → fun（すべりだい・ふうせん・ろけっと・ほし）
//   こうえん   → nature（き・おはな・きのこ・にじ）
//   デコレーション → building（おうち・さく・はし・たわー）
export interface TabDef {
  key: Category
  label: string
  color: string // タブの色（Roblox風の原色）
  emoji: string
}

export const TABS: TabDef[] = [
  { key: 'fun', label: 'スライド', color: '#ff4d4d', emoji: '🛝' },
  { key: 'nature', label: 'こうえん', color: '#3aa0ff', emoji: '🌳' },
  { key: 'building', label: 'デコレーション', color: '#ffc02e', emoji: '🎨' },
]

interface UIState {
  shopTab: Category | null // いま選ばれているタブ（ショップのカテゴリ絞り込み）
  setShopTab: (tab: Category | null) => void
}

export const useUI = create<UIState>((set) => ({
  shopTab: null,
  setShopTab: (tab) => set({ shopTab: tab }),
}))
