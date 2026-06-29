# kids-obby

5歳の息子向けに作る、**Roblox風のキッズ向け3Dゲーム**。
コインを集めて、大きなスライダー（すべりだい）をすべろう！（obby＝障害物コース＋コレクト系）

---

## 🟩 いまのメイン: Minecraft クローン（kids-voxel）

現在の `App` は **Web 製の Minecraft クローン**（`src/game/voxel/`）。本家 Minecraft の内部構造調査（[research-minecraft-mechanics.md](docs/research-minecraft-mechanics.md)）と[実装計画書](docs/implementation-plan-minecraft.md)に沿って、子供向けクリエイティブ寄りに作っている。obby の各ファイル（`Player`/`Course`/`build/*` 等）は温存。

```bash
npm install
npm run dev    # ブラウザで表示 URL を開く
```

- **🖱️ がめんをクリック**して あそびはじめる（pointer lock の一人称してん）
- **WASD / やじるし** うごく ・ **スペース** ジャンプ ・ **Shift** はやく走る ・ **F** とぶ（クリエイティブ飛行）
- **ひだりクリック=こわす / みぎクリック=おく**（クロスヘアが さしている ブロック）
- 下の **ホットバー**（くさ/つち/いし/すな/き/はっぱ/レンガ/にじいろ/ガラス/ライト）で おくブロックをえらぶ
- 8×8チャンク（128×128×64）の決定論ノイズ地形（丘・砂浜・水たまり・木）

**実装済み**: S0 品質基盤（strict/vitest）・S1 チャンク/パレット格納＋face culling描画＋計測・S2a DDA raycast設置/破壊・S2b 自前voxel-AABB衝突の一人称コントローラ・S3a 複数チャンク・**S4 フルBFSライティング（block/sky light伝播＋たいまつ＝ライトブロック・remove伝播）**・S5 地形生成・S7 UX・**視覚向上（手続き生成のピクセルアート・テクスチャアトラス＋頂点AO）**。
**後送り（§5[B] スコープ削減・近道ではない）**: Web Workerメッシュ(S3b)・IndexedDB永続化(S6)・greedy/AO/昼夜/タッチ(S8)。
**検証**: vitest 15件通過 / strict build 通過 / Playwright E2E（設置破壊・移動・ジャンプ・着地・ライティング[屋根で暗転→ライトで点灯→撤去で復帰]・fps120・drawCalls≤36・console error 0）通過。詳細は[実装計画書 §8](docs/implementation-plan-minecraft.md)。

---

## コンセプト

- ブラウザだけで動く（インストール不要・PC/タブレット）
- コインを集める・ジャンプする・大きなスライダーをすべる
- 敵なし・ゲームオーバーなし・チャットなし・課金なし（5歳が安全に遊べる）
- パパと息子だけのオリジナルゲーム

## 技術スタック

- **React 19 + TypeScript + Vite** — アプリ基盤
- **Three.js** — 3D描画
- **@react-three/fiber (R3F)** — ReactでThree.jsを書く
- **@react-three/rapier** — 物理エンジン(Rapier/WASM)。コイン取得やスライダーの当たり判定
- **ecctrl** — 物理駆動のキャラクターコントローラ（ジャンプ/歩き/坂・段差処理）
- **@react-three/drei** — KeyboardControls・Sky 等のヘルパー
- **zustand** — コイン数などの状態共有

## あそびかた

```bash
npm install   # 最初の1回だけ
npm run dev   # 開発サーバー → ブラウザで表示される URL を開く
```

- **WASD / やじるし** で うごく ・ **スペース** で ジャンプ ・ **Shift** で はやく走る
- コインに触れると おさいふ にたまる（🪙）
- **🏪 おみせ** で すきな アイテムを かう → **🎒 マイアイテム** で えらぶ → 地面の みどりの ところを クリックで せっち
- まちがえたら **↩️ もどす**（Undo）／ **✋ うごかす** で おいた ものを べつの ばしょへ
- き・おはな・きのこ・にじ／おうち・さく・はし・たわー／ふうせん・ろけっと・すべりだい・ほし の12しゅるいで じぶんだけの せかいを つくろう！

## ドキュメント

- [Roblox 技術・デザイン調査](docs/research-roblox-mechanics.md) — なぜ子供が夢中になるか・obby/コインの仕組み・Roblox本体の技術（3票検証済み）
- [Minecraft 技術・構造調査](docs/research-minecraft-mechanics.md) — 本家Minecraftの内部構造（チャンク/描画/ワールド生成/ライティング/netcode）とWebクローン実装への示唆（3票検証済み）
- [Minecraftクローン実装計画書](docs/implementation-plan-minecraft.md) — voxelクローン(kids-voxel)の13スプリント計画。依存グラフ・各スプリントのPlaywright E2E＋自己改善サイクル・3視点の敵対的レビュー反映済み
- [実装計画書](docs/implementation-plan.md) — フェーズ/スプリント・各スプリントのPlaywright自動プレイテスト＆自己改善サイクル

## ディレクトリ構成

```
kids-obby/
├── src/
│   ├── main.tsx          # Reactルート
│   ├── App.tsx           # Canvas + Physics + KeyboardControls + HUD
│   ├── store.ts          # zustand（コイン数など）
│   └── game/
│       ├── Player.tsx    # ecctrl キャラ + デバッグフック(window.__game)
│       ├── Course.tsx    # 地面・あしば・スライダー
│       ├── Coin.tsx      # くるくる回る金貨(センサーで取得)
│       └── level.ts      # コース配置データ
└── docs/
```

## 技術メモ（重要）

- **ecctrl 2.0.0 はキーボードを内蔵しない**。drei の `KeyboardControls` で囲み、`useKeyboardControls` で取得したキー状態を毎フレーム `ecctrlRef.setMovement({...})` に渡す（`src/game/Player.tsx` 参照）。README Quick Start の「KeyboardControls で囲むだけ」は古い情報。
- 開発時は `window.__game`（getState/teleport/setMovement）が公開され、Playwright自動テストで状態を数値検証できる。
- 物理エンジンの二重初期化を避けるため `main.tsx` で StrictMode は使わない。

## 開発状況

- [x] プロジェクト初期化（R3F + Rapier + ecctrl + leva）
- [x] 最初の遊べる版（地面・キャラ操作・ジャンプ・コイン取得・小さなobby・スライダー設置）
- [x] **クリエイト（建築）モード**: ショップ・購入・マイアイテム・地形ハイライト設置・Undo・移動 ＋ 12アイテム
  - データモデル/設置エンジンは一貫実装、12アイテムは**エージェントチーム並列生成**（`src/game/build/`、`docs/feature-build-mode.md`）
  - Playwright自律E2E全合格（買う→選ぶ→ハイライト→設置→重なり判定(2x2含む)→Undo→移動→移動Undo、実UI/実クリックも検証、0エラー）
- [ ] 効果音・パーティクル（買う/設置/取得の「ジューシー」な手応え）
- [ ] スライダーを本当につるつるに（物理チューニング）
- [ ] 建築のセーブ/ロード（localStorage で じぶんの せかいを ほぞん）
- [ ] モバイル操作（バーチャルスティック・ボタン）

> ⚠️ 既知の調整事項: スライダーは形だけ設置済みで「すべる」物理は未調整。段差1.5はジャンプ(2.47)で越えられるがレベルデザインは粗削り。three/rapier由来の無害な非推奨警告が3件（機能影響なし）。バンドルが大きい（コード分割は後で）。
