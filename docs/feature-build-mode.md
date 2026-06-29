# クリエイト（建築）モード 設計メモ

> 2026-06-17 実装。「コインを集めて→おみせで買って→マイアイテムから選んで→地形にハイライト→クリックで設置→Undo/移動」。
> リサーチ＋12アイテム生成は **エージェントチーム（Workflow）** で並列実施。データモデル・設置エンジン・UIは結合が強いため一貫実装。

## アーキテクチャ

```
src/store.ts                     coins=おさいふ（collect/addCoins で増、spend で減）
src/game/build/
  itemTypes.ts                   PackItem / ItemDef / Category
  grid.ts                        1マス=1単位のグリッド。snapToAnchor / cellsFor / groupCenter / inBounds
  catalog.ts                     CATALOG（12種）= naturePack + buildingPack + funPack を category タグ付け
  buildStore.ts                  zustand。mode/panel/inventory/placed/history/hover、buy/place/undo/move 等
  PlacementSystem.tsx            Canvas内：設置済み描画・透明な地面(ポインター)・ゴースト(半透明+緑/赤タイル)
  debug.ts                       window.__game.build（Playwright自律E2Eの操作シーム）
  packs/{nature,building,fun}Pack.tsx   エージェントチーム生成のアイテム実装
src/ui/BuildUI.tsx               DOM：ツールバー(🏪🎒✋↩️)・ショップ・マイアイテム・設置バナー
```

## キー設計判断

- **設置入力**: 透明だが `visible` な地面メッシュ（`opacity:0` で raycast 可）に `onPointerMove`/`onClick`。R3F の `e.point` でワールド座標を取り、グリッド吸着。`visible={false}` だと raycast されないので不可。
- **重なり判定**: 設置済みの占有セルを `Set<"x,z">` 化し、footprint の全セルが空きかつ範囲内なら設置可（緑）。2x2/2x1 もセル展開で正しく判定。
- **Undo**: 履歴スタック `{place}|{move,from}`。place の取り消し＝撤去＋インベントリ返却、move の取り消し＝元セルへ。
- **移動**: 「うごかす」で設置済みをクリック→持ち上げ（worldから外し mode=moving）→再クリックで再設置（同uid、履歴に move）。キャンセルで元位置へ復帰。
- **ビルド中はキャラ静止**（固定アングルの追従カメラ）で設置しやすく。
- **アイテム契約**: 各 Model は three.js プリミティブのみ・原点中心・底面 y=0・footprint 内・`castShadow`。`PackItem[]` を export。

## 検証（Playwright自律E2E）

`window.__game.build`（getState/addCoins/buy/selectItem/setHover/place/pickUp/undo/cancel）で全フローを数値検証。実UIボタン・実キャンバスクリック設置も検証。全合格・コンソールエラー0。
- 自己改善で修正した不具合: ①ecctrl入力配線 ②jumpVel ③HUDが「コイン/8＋全部集めた」を誤表示（coins=おさいふに意味変更）→ おさいふ表示に修正。

## 追加機能（2026-06-18・4機能を一括実装＆E2E検証）

> 当初4並列エージェント(Workflow)で実装予定だったが、エージェントが全員stall→workflow失敗。コア結合が強くユーザーも並行編集中だったため、リード(Claude)が現行コードに合わせて一貫実装し直した。全機能Playwright自律E2E合格・0エラー。

- **効果音・キラキラ（ジューシー）**: `audio.ts` に Web Audio 合成SFX（buy/place/pickup/undo/delete/rotate/nope。音源ファイル不要）を追加。`fx/fxStore.ts`＋`fx/Sparkles.tsx` でパーティクル（設置/取得/削除で発火）。コイン数の弾みCSS。`window.__audio.ui` で発火数を検証。
- **セーブ/ロード**: `build/persist.ts`。localStorageに {coins,inventory,placed(rot含む)} を自動保存(600msデバウンス)＋起動時復元。E2E: 保存→改変→load復元、**ページ再読込でも復元**（回転も保持）を確認。
- **回転＋ゴミ箱**: PlacedItemに `rot(0..3)`。`grid.effFootprint` で90/270度はfootprint入替（非正方形の占有・タイルも正しく回転）。🔄まわすボタン、🗑️けすトグル（削除＝インベントリ返却＋undoで復活）。
- **モバイル操作**: `ui/mobile/`（touchStore＋TouchControls）。バーチャルスティック＋ジャンプ。`(pointer:coarse)` のみ表示しデスクトップ不変。Playerで毎フレーム合成。`window.__game.touch` でE2E。スティック前進1.78・タッチジャンプ2.46を確認。

## さらに次の候補

- スライダー物理（本当にすべる）
- アイテムの色ちがい／ごほうび（着せ替え）
- スティックのアナログ速度・8方向→360度
