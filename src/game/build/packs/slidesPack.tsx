import type { PackItem } from '../itemTypes'
import { bigSlideItem } from './slides/bigSlide'
import { twinSlideItem } from './slides/twinSlide'
import { rainbowSlideItem } from './slides/rainbowSlide'

// 追加スライダー集（agentチームが1ファイルずつ実装）。fun カテゴリ＝上タブ「スライド」に並ぶ。
export const slideItems: PackItem[] = [bigSlideItem, twinSlideItem, rainbowSlideItem]
