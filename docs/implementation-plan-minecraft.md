# kids-voxel 実装計画書（Minecraftクローン / 子供向けクリエイティブ）— 最終版

> 作成日: 2026-06-18 / 最終編集: 2026-06-18（3名の敵対的レビューを反映）
> 根拠: [`research-minecraft-mechanics.md`](./research-minecraft-mechanics.md)（3票検証済み調査）＋ 5ドメイン統合設計（voxel-data / 描画メッシュ化 / interaction-creative / lighting-worldgen / test-harness）＋ 実コードベース検証（`tsconfig`/`package.json`/`Player.tsx`/`App.tsx`/`build/`/`node_modules`）
> 対象: 5歳の息子向け Web Minecraftクローン（自由建築中心 / 敵・戦闘・死亡なし / 固定小規模ワールド）
> スタック（既存・原則変更しない）: React 19 + TypeScript + Vite 8 + Three.js 0.184 + R3F 9(@react-three/fiber) + @react-three/rapier 2.2.0(Rapier 0.19.2 WASM) + drei + ecctrl 2.0.0 + zustand 5 + leva。テストは Playwright MCP（＋ vitest を S0 で導入）。
> 開発体制: Claude Code 並列3〜5本 + 承認Gate最小 + エージェント間自律実装。**各スプリント完了時に Playwright MCP でClaude自身が実プレイ→デバッグ→自己改善サイクル** を必須実行。
> ベースの計画書（[`implementation-plan.md`](./implementation-plan.md)）の章立て・思想を踏襲し、obby から voxel クローンへ発展させる。

---

## 0. 方針と優先順位

**優先順位（厳守・全社ルール）**: 品質・保守性・拡張性 ＞ AI並列での速度活用 ＞ スコープ削減 ＞ 納期延長 ＞ 近道・フォールバック。
近道（フォールバック多用 / `any`逃げ / テスト省略 / 設計逸脱 / MVP理由の設計省略）は**第一選択肢にしない**。工数オーバーが見えたら勝手に近道せず3択（§5）を提示する。

### 0.1 品質ゲートの前提を実態に一致させる（レビュー反映・最重要）

実コードベースを検証した結果、**当初計画が前提にしていた品質ゲートと実態に致命的な乖離があった**。これを S0 着手の最初の順次タスクで是正する（is着手前に必須）:

- **(A) `strict` 不在**: `tsconfig.app.json`/`tsconfig.node.json` に `"strict": true` キーが**存在しない**（実ファイルで確認）。あるのは `noUnusedLocals`/`noUnusedParameters`/`verbatimModuleSyntax`/`erasableSyntaxOnly`/`noFallthroughCasesInSwitch` のみ。strict なしでは暗黙 `any`・null/undefined 未チェックが通り、`npm run build` 成功が `any 逃げ` を捕捉できない。voxel コア（TypedArray・ビット演算・パレット index）は型安全が最も効く領域であり、strict 不在は致命的。
  → **S0 最初の作業で `tsconfig.app.json` に `"strict": true` を追加**し、既存コード（`build/`/`Player.tsx`/`App.tsx`）が strict 下で `npm run build` 通過することを確認・修正する。以降のゲート文言は「strict 設定 = `strict:true` + `noUnused*` + `verbatimModuleSyntax`」と正確化する。
- **(B) テストランナー不在**: `package.json` に vitest/jest 等が**一切ない**。S0 の純関数テストを実行する基盤がない。
  → **S0 で vitest を devDependency 追加**し `npm run test` スクリプトを設ける（Vite 設定とネイティブ統合・`.ts` 拡張子 import を解決できる唯一の現実解）。自己改善ループに**ゲート1.5（`npm run test`）**を追加する。
- **(C) 計測基盤不在**: `getFps()` は `Player.tsx` の closure-local `fpsRef` で外部公開されておらず（`getState().fps` 経由のみ）、`tris`/`drawCalls` の取得元（`gl.info` は R3F が毎フレーム reset するため `gl.info.autoReset=false` の明示配線が必須）も未定義。
  → **S0 で `perf.ts`（FPS・描画統計の単一レジストリ）を成果物化**し、`tris`/`vertices` は `ChunkMeshManager` が各 `BufferGeometry` の `index.count`/`position.count` を自前合算（`gl.info` 非依存・決定論的）、`drawCalls` は `gl.info.render.calls` を `autoReset=false` で1フレームキャプチャ、という**計測契約を `debugTypes.ts` に凍結**する（§3.1 計測契約）。

**忠実コア（簡略化禁止・順次の背骨）**:
1. チャンク/16³セクション + パレット圧縮格納（palette配列 + index TypedArray、単一state省略）
2. 座標系の相互変換（world↔chunk↔section↔local）をビット演算の純関数で確定（負座標も2の補数で正しく回る）
3. 単一権威ソース（`VoxelWorld.setBlock` が唯一の書き込み口）= 内部サーバー権威モデルの萌芽
4. **face culling 描画**（＝忠実コアの「存在」要件）+ dirty flag によるセクション単位の局所再メッシュ（1セクション=1メッシュ）。greedy meshing は**同じ純関数メッシャの最適化**であり S8 で差し替え（§0.2 で明記）
5. ブロック設置/破壊（VoxelWorld経由）+ Amanatides-Woo DDA voxel raycast
6. block/sky light の push型 BFS flood-fill 伝播（Starlight的最適化）+ 頂点カラー反映
7. 手書き決定論ノイズ（fBm 2D高さ場）による固定小規模ワールド生成
8. IndexedDBチャンク永続化（NBT/Anvilのweb置換）
9. データ層のThree非依存（VoxelWorld/Chunk/Section は純TS）= ユニットテスト可能
10. **プレイヤー衝突**: 研究§6.2（line 202）が定石とする **chunk配列を直接引く方式**。本計画は Rapier 0.19.2 が**ネイティブ `ColliderDesc.voxels` を持つ**ことを確認済み（`node_modules/.../collider.d.ts:633`、`setVoxel`/`propagateVoxelChange`/`combineVoxelStates` 完備）。これを**チャンク単位 voxel collider（1チャンク=1 collider）**として採用する（§S2b）。個別 cuboid collider の大量生成は採らない。

### 0.2 研究の忠実コアに対する明示的な逸脱・解釈（正直な線引き・レビュー反映）

- **greedy meshing の位置づけ**: 研究は greedy meshing を忠実コア（§1.4, §6.3）に挙げる。本計画は「**face culling は忠実コアとして S1 で必ず実装する（存在要件）。greedy meshing は同一純関数メッシャの最適化であり S8 で差し替える**」と解釈する。メッシャは純関数なので差し替えコストは小さい。§5[B] の「greedy 据置」は**最適化の後送り**であって忠実コア（face culling）の省略ではない。当初計画の「greedy をコアかつ最後 かつ §5[B]カット候補」という矛盾を解消した。
- **テクスチャ非採用（意図的逸脱）**: 研究はテクスチャアトラス/blockstate JSON モデルを「Minecraftらしい見た目」の忠実コアに挙げるが、本計画は **5歳児向けアートディレクションとして flat `faceColors` + `MeshLambertMaterial`（テクスチャなし）を意図的に採用する**。これは省略ではなく明示的な逸脱。テクスチャ化は将来ロードマップ（§7）に置く。

**スコープ簡略化（子供向け・データ構造は変えずサイズ/機能のみ縮小）**:
固定 8×8チャンク（128×128ブロック）・垂直4セクション（Y=0..63）。無限ストリーミング・洞窟・aquifer・天候・サバイバル（空腹/戦闘/Mob/死亡）・レッドストーン・netcode は**対象外**。AOはMVP無効（後でオプトイン）。Web Worker メッシュは S3b（独立スプリント）で段階導入（境界interfaceは S0 で凍結）。

**メモリ予算（レビュー反映・S0/S8で監視）**: 固定 8×8×4 = 256 セクション。生成後の埋まったセクション1個あたり概算 = `indices`(Uint16×4096=8KB) + `blockLight`(4KB) + `skyLight`(4KB) + メッシュ `BufferGeometry`(face cull後、数十KB GPU) + voxel collider（チャンク単位なので個別cuboid比で激減）。256セクション最悪値で**JSヒープ数百MB級**を見込み、2〜3GB共有RAMのタブレットを想定上限とする。`getChunkStats()` に `totalVertices` と `heapUsed`（`performance.memory` が使える環境のみ）を追加し、S8 でベースラインを固定する。

**設計の北極星**: 「面を狙ってブロックを積む/壊す」マイクラの核体験を、子供が安全・直感的に（**操作可能な照準/タップ・ターゲット**・タッチ・誤操作耐性・落下死なし・任意飛行）遊べる形で成立させる。

**並列の原則**: タスクは4〜8h相当のClaudeセッション単位に分解。**並列と書く箇所は本当に独立しているもののみ**。依存で順次必須な背骨（共有スキーマ確定→チャンク格納→メッシュ化→設置/破壊→ライティング→地形生成→統合・テスト）は並列化で短縮しない（§2で明示）。

---

## 1. 現状（既存 kids-obby 基盤）

最初の遊べる obby 版が完成・検証済み（Playwrightで move 2.04 / jump 2.47 / coin取得 / 0エラー）。voxel クローンはこの基盤を**発展**させる（破壊しない）。

### 1.1 流用するもの（温存・思想継承）
- ✅ R3F + Rapier + ecctrl スタック稼働（`App.tsx`: Canvas + Physics + KeyboardControls + Player）
- ✅ `Player.tsx`: ecctrl 三人称キャラ。`getKeys()→setMovement()` 毎フレーム供給、**固定アングル追従カメラ（`CAM_OFFSET 0,7.5,13`・`lookAt(player+1.2)`・回転しない／実ファイルで確認）**、FPS計測（closure-local `fpsRef`）。**voxel でも保持**し、地面を voxel 上面で成立させる。
- ✅ `window.__game` マージ規約（`Player.tsx`: `w.__game = { ...(w.__game ?? {}), ...api }`、`build/debug.ts`: `w.__game.build = {...}`）。**voxel フックも同一規約で `w.__game.voxel = {...}` を増設**（上書きしない）。
- ✅ `store.ts`(useGame coins) は独立スライスとして温存。voxelStore は別 store として追加（混ぜない）。
- ✅ `build/` の UXパターン（mode / ゴーストプレビュー / ワンタップ設置 / タッチ対応 / undo履歴 / インベントリ。`buildStore` の `mode:'play'|'placing'|'moving'`/`inventory`/`history`/`selectedItemId`/`undo` を実ファイルで確認）→ voxel側のホットバー&設置UIに**思想流用**。
- ✅ ビルドゲート: `npm run build`（`tsc -b && vite build`）。**ただし strict は S0 で追加してから**（§0.1-A）。

### 1.2 「前身」としての build mode の位置づけと置換方針（判断: 置換ではなく別レイヤー新設→段階移行）
既存 `src/game/build/`（`grid.ts`/`buildStore.ts`/`PlacementSystem.tsx`/`catalog.ts`/`packs/`）は「個別R3Fメッシュを数十個・2D(X,Z)・地面Y=0平面・footprint吸着・ショップ/コイン経済」のオブジェクト設置システム。**研究と既存コメント自体が「数千voxelには破綻」と認めている**=voxel設置の前身。

判断: **build を置換せず、`src/game/voxel/` レイヤーを新設し別レイヤーとして併存させ、段階移行**する。理由3点:
1. **目的とデータモデルが別物**: build は数十個の個別メッシュ。voxel は「16³パレット圧縮・3D・face culling/greedy・1セクション1メッシュ」。grid.ts(2Dセル+footprint)を無理に3D化すると保守性を損なう。
2. **座標系が非互換**: grid.ts は「整数セル=footprint最小コーナー、`groupCenter`で中心」。voxel は「1voxel=1×1×1、整数座標の中心=+0.5、BoxGeometry中心原点」。統合すると分岐だらけ→`coords.ts` を新規に切る（既存 grid は触らない）。
3. **既存資産を無駄にしない**: build の家具・木などのデコ系オブジェクトは、将来 voxelワールド上の**装飾レイヤー**として共存できる（地形=voxel、置物=既存 build group）。よって削除でなく共存。

| 既存資産 | 扱い |
|---|---|
| `App.tsx` / `Player.tsx` / `store.ts`(coins) | **保持**。Physics配下に `<VoxelWorld/>`+`<VoxelInteraction/>` を追加、Player の `enable` 参照を voxel 操作可否へ差し替え。**directionalLight の shadow camera 境界（現状±44=obbyサイズ）を 128×128 voxel ワールド用に再調整**（S1）。**PlacementSystem の透明地面 onPointer 平面は voxel モードで無効化**し voxel raycast を妨げない |
| `window.__game` マージ規約 | **厳守**して `.voxel` 増設 |
| `build/` UXパターン | **思想流用**（ホットバー/ゴースト/undo/タッチ） |
| `build/`（PlacementSystem/buildStore/grid/catalog） | **当面併存**（「かざりモード」として温存可）。voxel が主役になったら deprecate |
| `Environment.tsx` 手作り公園 | 別レイヤー。voxel 移行後は `worldgen/structures.ts` へ役割が移るが共存可 |

> モジュールパスは既存 `src/game/build/` の慣例に合わせ **`src/game/voxel/` 配下に統一**する。

---

## 2. 依存グラフ（順次必須 vs 並列可）

研究 §6.3 の構築順序は依存で**順次必須**: チャンク格納 → meshing → 設置/破壊 → ライティング → 地形生成。これを背骨に置く。レビューを反映し、**過小見積もりだった S2/S3/S4 を分割**して難所を独立可視化した。

```
[完了: obby基盤 + window.__game + buildのUX知見]
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ S0 共有スキーマ確定 + 品質/計測基盤（順次の起点・並列禁止） │
│  strict:true / vitest / perf.ts(計測契約)                  │
│  constants / coords / blocks / Section・Chunkレイアウト     │
│  VoxelWorld API / debugTypes(フック契約) /                 │
│  voxelBuildStore公開スキーマ / meshWorkerメッセージ契約 /   │
│  faceShade契約 / console error除外ホワイトリスト           │
└──────────────────────────────────────────────────────────┘
        │  ← ここを凍結するまで分担並列しない
        ▼
┌──────────────────────────────────────────────────────────┐
│ ===== 忠実コアの背骨（順次必須・短縮不可）=====              │
│ S1 チャンク格納 + 静的1チャンク face culling 描画 + perf配線 │
│        │                                                   │
│        ▼                                                   │
│ S2a 設置/破壊（DDA raycast）+ 局所再メッシュ + ストア + 照準  │
│        │                                                   │
│        ▼                                                   │
│ S2b 衝突（ColliderDesc.voxels）+ ecctrl 接地安定 + 順序契約  │
│        │                                                   │
│        ▼                                                   │
│ S3a 複数チャンク + 境界markDirty厳密化（メインスレッドmesh）  │
│        │                                                   │
│        ▼                                                   │
│ S3b Workerメッシュオフロード + apron + meshRev stale破棄     │
│        │                                                   │
│        ▼                                                   │
│ S4a ライティング sky/block add伝播 + 頂点カラー             │
│        │                                                   │
│        ▼                                                   │
│ S4b remove伝播の完全復帰 + 二重照明調整                     │
└──────────────────────────────────────────────────────────┘
        │
        ├──────────────────┬───────────────────┐
        ▼                  ▼                   ▼
[S5 地形生成]        [S6 永続化]         [S7 子供向けUX/ホットバー]
 noise/2D高さ場       IndexedDB往復       こわす・とぶ・ゴースト
 バイオーム/木        デバウンス保存       タッチ大ボタン・undo
 (S1依存・S4統合は     (S1依存・並列可)    (S0でstore凍結後
  順次エッジ)                              ・並列可)
        │                  │                   │
        └────────┬─────────┴─────────┬─────────┘
                 ▼                   ▼
        [S7.5 並列トラック結合スモーク（S5+S6+S7）]
                 │
                 ▼
        [S8 仕上げ・性能・greedy/AO・昼夜(任意)・統合]
        greedyへ差し替え・AOオプトイン・昼夜(任意)
        FPS/drawCalls/heapベースライン固定
                 │
                 ▼
[将来の別ロードマップ §7: サバイバル/マルチ/レッドストーン/テクスチャ]
```

### 2.1 順次必須で短縮できない背骨（明示）
`S0 → S1 → S2a → S2b → S3a → S3b → S4a → S4b → S8`。
- S0 は座標系・BlockType・Sectionレイアウト・VoxelWorld API・フック契約・**voxelBuildStore公開スキーマ・meshWorkerメッセージ契約・faceShade契約**の凍結。**ここが固まるまで分担並列しない**。
- ライティング(S4a/b)・地形生成(S5)は研究 §6.3 通り格納・meshing・設置/破壊の確定が gate。mock への近道で先行しない。
- **S5 と S4 の統合点は順次必須**: `worldgen/generate.ts` は「地形→着色→構造物→**一括ライティング(S4)**→初回メッシュ」のオーケストレータであり、S4 の確定 API に依存する（木陰=葉真下 skyLight 減衰の検証は S4 統合が前提）。依存グラフに **S4→S5統合の順次エッジ**を描いた。

### 2.2 並列可（本当に独立しているもののみ）
- S0 凍結後: **メッシャ純関数（greedyMesher / face culling）** と **永続化（persistence）** は VoxelWorld の get/set シグネチャ＋**meshWorkerメッセージ契約**凍結後に並列可。
- **ブロックカタログ定義 / ホットバーUI / インベントリUI / 飛行トグルUI** は VoxelWorld get/set 凍結＋**voxelBuildStore公開スキーマ凍結**後に並列可（S7 の内訳）。raycast コアと衝突は順次。
- **S5 地形生成（worldgen）** は S1（格納）依存。ただし**S4 ライティングとの統合点は順次**（§2.1）。生成ロジック自体は S6/S7 と別エンジニアが並列可。
- **S6 永続化** は S1 依存で S2〜S5 と並列トラック可。
- **S7 子供向けUX** は **S0 で voxelBuildStore 公開スキーマ（`selectedBlockId/tool/hotbar/fly/history` の型）を凍結して初めて** S2 と真に並列可能（凍結しない場合は「S2のストアスキーマ確定後に並列可」へ降格）。S0 でこのスキーマを凍結対象に含めることで並列を成立させる。
- **並列→統合は順次必須**: S5/S6/S7 が初めて噛み合う結合バグ（生成チャンクの二重保存、UX設置が worldgen 由来ブロックを壊す境界 等）を吸収するため、**S7.5 結合スモーク**を S8 とは別に置く。

### 2.3 見積もり（Claude セッション単位 = 4〜8h相当・レビュー反映で補正）

| Sprint | 規模 | 依存 | 並列可否 | 担当領域（5ドメイン） |
|---|---|---|---|---|
| S0 共有スキーマ + 品質/計測基盤 | **2.5** | — | **順次の起点・並列禁止** | voxel-data 主導（全ドメイン合意）+ test-harness |
| S1 チャンク格納 + 静的描画 + perf配線 | 2 | S0 | 順次（背骨） | voxel-data + 描画 + test |
| S2a raycast + 設置/破壊 + ストア + 照準 | 2 | S1 | 順次（背骨） | interaction + voxel-data |
| S2b 衝突(ColliderDesc.voxels) + ecctrl接地 + 順序契約 | 1.5 | S2a | 順次（背骨） | interaction + voxel-data |
| S3a 複数チャンク + 境界markDirty厳密化 | 2 | S2b | 順次（背骨） | 描画 + voxel-data |
| S3b Workerオフロード + apron + meshRev | 2 | S3a | 順次（背骨） | 描画 |
| S4a ライティング add伝播 + 頂点カラー | 2 | S3b | 順次（背骨） | lighting |
| S4b remove伝播の完全復帰 + 二重照明調整 | 1.5 | S4a | 順次（背骨） | lighting |
| S5 地形生成(noise/2D高さ場/バイオーム/木) | 2 | S1（S4統合は順次） | S6/S7と並列可 | lighting-worldgen |
| S6 IndexedDB永続化 | 1.5 | S1 | S5/S7と並列可 | voxel-data |
| S7 子供向けUX/ホットバー/タッチ/undo/飛行 | 2 | S0(store凍結) | S5/S6と並列可 | interaction |
| S7.5 並列トラック結合スモーク | 0.5 | S5,S6,S7 | 順次（統合） | test + 全ドメイン |
| S8 仕上げ・性能・greedy/AO・昼夜(任意)・統合 | 2 | S4b,S5,S6,S7.5 | 順次（統合） | 全ドメイン + test |

**背骨（順次・短縮不可）**: S0(2.5) + S1(2) + S2a(2) + S2b(1.5) + S3a(2) + S3b(2) + S4a(2) + S4b(1.5) + S7.5(0.5) + S8(2) = **約18セッション**。
**並列トラック（背骨と同日消化可）**: S5(2) + S6(1.5) + S7(2)。背骨に隠れる純増は S7.5 統合のみ。
**総量**: 約23.5セッション（並列考慮後の実時間は背骨18 + 並列はみ出し分）。当初の楽観的な16.5から、難所分割で正直に上方修正した。納期影響は §5[A] の前提として正直に提示する。

---

## 3. 自動プレイテストの仕組み（Playwright MCP + 拡張 window.__game）

既存 `window.__game`（getState/teleport/setMovement と build.*）のマージ規約をそのまま踏襲し、**本番の権威ストア（VoxelWorld）に薄いデバッグadapterをかぶせて** `window.__game.voxel` 名前空間を増設する（テスト専用の別状態を作らない=研究 §4.2 内部権威モデルと整合）。型は `src/game/voxel/debugTypes.ts` に集約し `any` 禁止。

### 3.0 計測契約（S0で凍結・レビュー反映の根幹）

「機械検証可能」を成立させるため、以下の取得経路を S0 で `debugTypes.ts` と `perf.ts` に凍結する:

- **`tris` / `totalVertices`**: `ChunkMeshManager` が保持する各 `BufferGeometry` の `index.count`/`getAttribute('position').count` を**自前合算**して返す（`gl.info` 非依存・決定論的・`waitForMeshIdle` 解決後に確定）。`meshTriangles(cx,cz,sy)` も同経路でセクション単位合算。
- **`drawCalls`**: `gl.info.render.calls` を **`gl.info.autoReset = false` を設定した上で**1フレーム描画後にキャプチャ（R3F は既定で毎フレーム `gl.info.reset()` するため明示プラミング必須）。`perf.ts` が reset タイミングを所有する。
- **`fps`**: `Player.tsx` の `fpsRef` を `perf.ts` の単一レジストリへ**登録**する改修を S1 最初の順次タスクで実施。`getFps()` はレジストリを読むだけ。既存 `getState().fps` とは**レジストリ一本化**（二重計測しない）。
- **`heapUsed`**: `performance.memory?.usedJSHeapSize`（使える環境のみ・無ければ null）。
- **累積カウンタ**: `remeshCount` / `meshJobsTotal`（「この操作で再メッシュが起きたか」を差分で検証するため。瞬時値 `dirty` では区別不能）。
- **永続化統計**: `getPersistStats():{writes,lastFlushMs,pendingChunks}`（デバウンス効果を `writes < setCount` で検証）。

### 3.1 voxel向けフック一覧（`src/game/voxel/debug.ts` の `setupVoxelDebug()`）
- **読み取り（同期・権威ストア直読み）**:
  - `getBlock(x,y,z): BlockId`
  - `getChunkStats(): { loaded, meshed, dirty, tris, totalVertices, drawCalls, sections, remeshCount, meshJobsTotal, heapUsed }`
  - `getFps(): number`（perf.ts レジストリ読み取り）
  - `getLight(x,y,z): { block, sky }`
  - `getFaceShade(x,y,z,faceDir): number` — faceShade出力の直接検証（getLight と描画反映の分離検証用・レビュー反映）
  - `getWorldInfo(): { chunkSize, sectionSize, worldBounds, seed }`
  - `getPalette(cx,cy,cz): BlockId[]`
  - `getPersistStats(): { writes, lastFlushMs, pendingChunks }`
  - `getProjectedCell(x,y,z): { sx, sy } | null` — 既知ブロック中心の画面投影座標（タッチ決定論テスト用・レビュー反映）
- **書き込み（データ即時確定 / メッシュ・光は非同期後追い）**:
  - `setBlock(x,y,z,id): boolean` / `placeBlock(target,id): boolean`（`hit.prev` に置く本家place仕様）/ `breakBlock(x,y,z): boolean`
  - `raycastVoxel(origin,dir): RaycastHit{ hit, block, prev, normal, distance }`（引数null=照準前方）
- **非同期完了待ち（契約を厳密化・レビュー反映）**:
  - `waitForMeshIdle(timeoutMs=5000): Promise<boolean>` — `dirtySections.size===0 && scheduler.inFlight===0 && 最新meshRev全採用済み` で `resolve(true)`、timeout で `resolve(false)`。**テスト側は必ず `=== true` を assert**。
  - `waitForLightIdle(timeoutMs=5000): Promise<boolean>` — BFS伝播キュー空で `resolve(true)`、timeout で `resolve(false)`。
  - `waitForCollidersIdle(timeoutMs=5000): Promise<boolean>` — プレイヤー周辺セクションの collider 登録完了で resolve（teleport/respawn の float-ray すり抜け防止・レビュー反映）。
- **テスト補助・決定性**:
  - `loadSeed(seed) / resetWorld() / snapshot(): string`（決定論ハッシュ文字列＝全チャンクの palette+indices を連結した FNV/SHA。`===` で比較可能・レビュー反映）/ `setRenderDistance(n)`
  - `selectBlock(id) / setTool('place'|'break') / setFly(on) / undo()`
  - `persistFlush(): Promise<void>`
  - `count(): number / dirtySections(): string[]`

> 既存 `getState/teleport/setMovement`(Player) と `build.*`(debug.ts) は**保持**。

### 3.2 E2E固定7ステップ（全スプリント共通テンプレ）
```
[E2E-TEMPLATE Sx]
 S0 起動: browser_navigate(http://localhost:5173) → browser_wait_for(()=>!!window.__game?.voxel)
 S1 健全性: browser_console_messages → リスト外 error/warn 件数 0（§3.3 ホワイトリスト適用後）
 S2 初期数値: browser_evaluate(getChunkStats/getWorldInfo) → loaded/sections/worldBounds を数値 assert
 S3 状態変更: setBlock/placeBlock/breakBlock 実行 → 即時 getBlock で論理 assert（同期）
            → assert((await waitForMeshIdle())===true) → getChunkStats().tris の増減を assert
 S4 実入力経路: dispatchEvent(KeyboardEvent)/マウスクリック注入で「ゲーム操作経由」も通す
 S5 描画アーティファクト: browser_take_screenshot → 非ブロッキングの回帰レビュー用（収束条件には含めない・§3.4）
 S6 性能: getFps() しきい値 assert ＋ getChunkStats().drawCalls ≤ しきい値 ＋ heapUsed 記録
```

### 3.3 console error 除外規約（ホワイトリストを S0/S1 で成果物化・レビュー反映）
既存の「three/rapier/ecctrl 由来 deprecation は除外」を継承。**S0（遅くとも S1 着手時）に `docs/voxel-console-whitelist.md` を成果物化**し、各エントリに「正規表現 + 理由 + 追加日」を記す。S3b の Worker module 警告・rapier WASM 初期化ログ・ecctrl deprecation の具体パターンを列挙。追加は**必ず1件ずつ理由付きでレビュー**。テストハーネスは**リスト外の error/warn が1件でもあれば fail**（「黙って全 warn 無視」は近道として禁止）。

### 3.4 screenshot とフックの役割分担（客観性確保・レビュー反映）
- **ロジックの正しさは全て状態フック（`getBlock`/`getLight`/`getFaceShade`/`tris`/`getState`）で数値 assert し、収束条件（§4 の AND）に入れる。**
- **screenshot は「回帰時の人間レビュー用アーティファクト（非ブロッキング）」**と位置づけ、**収束条件の AND からは外す**。Sky/directionalLight/昼夜でピクセルが変動しうるため素朴なピクセル差分は不安定。
- どうしても見た目を自動判定する必要がある箇所のみ、判定可能な代理メトリクス（例: `getProjectedCell` で得た画面座標の明度がしきい値以上、特定領域の非背景ピクセル数）を定義する。

---

## 4. 自己改善サイクル（バグ・低再現性への対応）

```
self-improvement-loop (MAX_ITER = 4):
  for i in 1..4:
    1. 欠陥を記録（症状 + 推定原因 + 該当フック値）
    2. 最小修正（研究 §6.3 の順次依存・設計書を逸脱しない）
    3. ゲート1:   npm run build (= tsc -b && vite build) 成功必須
                 （strict:true + noUnused* + verbatimModuleSyntax を満たす／§0.1-A）
                 ※ tsc 単体でなく vite build まで通し、Worker/WASM バンドル破綻を毎反復で捕捉
    4. ゲート1.5: npm run test (vitest) 成功必須（純関数テスト・§0.1-B）
    5. ゲート2:   §3 の E2E テンプレ再実行
    6. 収束判定（AND）:
         - 全受け入れ基準（§6 各スプリント）数値 assert 合格
         - リスト外 console error == 0（§3.3 ホワイトリスト適用後）
         - getChunkStats().dirty == 0（waitForMeshIdle が true で解決済み）
         - screenshot は収束条件に含めない（§3.4）
       → 収束。§8 トラッカーに反復回数と修正内容を記録。
  収束せず（i == 4 到達）:
    → 近道（any逃げ/テスト省略/設計逸脱）を取らず停止し、§5 の3択を提示
      （各スプリント末尾の「非収束時の[C]犠牲」を具体的に添えて）。
```

> obby 実績: 最初の遊べる版で2サイクル回した（①ecctrl入力配線→移動修正、②jumpVel 5→6.5）。voxel でもこの実績運用を継続。

---

## 5. 工数オーバー時の3択（近道を勝手に選ばない）

工数オーバーが見えたとき、勝手に近道を選ばず必ず3択を返す:
- **[A] 品質維持 + 納期延長（推奨）** — 忠実コア・strict・テストを犠牲にしない。背骨18セッション（短縮不可）を正直な前提として提示。
- **[B] スコープ削減（機能後送り）** — 例: greedy meshing を face culling のみに据置（S8後送り・忠実コアの face culling は維持）/ Workerオフロードを後送り（S3b を後段に・メインスレッド据置）/ 昼夜サイクル後送り / AO 後送り。
- **[C] 近道許容（非推奨・犠牲箇所を具体明示）** — 各スプリント固有の[C]を本文末尾に紐付け（下記）。**犠牲を必ず具体的に書く**。

代表的な分岐点と既定の3択提示タイミング: メッシュ/ライティングのタブレットFPS閾値割れ、ライティング remove伝播の暗いシミ未収束、自前ノイズの質不足、衝突の接地不安定、メモリ予算超過。各スプリント末尾に「非収束時の[C]犠牲」を1行で明示する。

---

## 6. スプリント詳細

> 各スプリントは「単体で遊べる/検証できるインクリメント」。受け入れ基準は全て**数値化・機械検証可能**。各末尾に self-improvement loop（MAX=4）の固有収束条件＋非収束時[C]犠牲を明示。

### S0 共有スキーマ確定 + 品質/計測基盤〔2.5・順次の起点・並列禁止〕
- **目的**: 全レイヤーの共通言語と品質ゲートを凍結。これが固まるまで分担並列しない。
- **作業**:
  - **(品質)** `tsconfig.app.json` に `"strict": true` を追加し、既存コード（`build/`/`Player.tsx`/`App.tsx`）が strict 下で `npm run build` 通過するよう修正（§0.1-A）。
  - **(テスト基盤)** vitest を devDependency 追加 + `"test": "vitest run"` スクリプト + vite 設定の `test` セクション（`verbatimModuleSyntax`/bundler 解決との整合確認）。`coords.test.ts` を成果物に含める（§0.1-B）。
  - **(計測基盤)** `perf.ts`（FPS・描画統計の単一レジストリ）を成果物化。計測契約（§3.0）を凍結。
  - `constants.ts`: `SECTION=16`/`SECTION_BITS=4`/`SECTION_MASK=15`/`SECTION_VOL=4096`、子供向け固定寸法 `WORLD_CHUNKS_X/Z=8`・`SECTIONS_Y=4`（縦64）・`ENABLE_AO=false`。簡略化はこのファイルの寸法のみ。
  - `coords.ts`: `worldToChunk/worldToLocalX/Z/worldToSectionY/worldToLocalY/chunkOriginX`、`blockToWorldCenter`(+0.5)/`worldPointToBlock`。全て純関数・ビット演算・負座標も `>>`/`&` で正しく回る。
  - `blocks.ts`: `BlockId`(0=AIR予約)、`BlockType{ id,name,displayName,solid,opaque,lightEmission,opacity,emission,translucent,faceColors }`。**flat faceColors 採用（テクスチャ非採用・§0.2 の意図的逸脱）**。子供向け初期12種（くさ/つち/いし/すな/みず/き/はっぱ/レンガ/にじいろ/ガラス/くも/ライト）。
  - `Section`/`Chunk` のレイアウト規約（local index `(y<<8)|(z<<4)|x`、light index `(y&15)*256+(z&15)*16+(x&15)`）。**不変条件: `Section.indices` は常に standalone `Uint16Array`（自前 ArrayBuffer・byteOffset 0・length SECTION_VOL）。プール view にしない**（structured-clone/transfer を曖昧にしない・レビュー反映）。
  - `VoxelWorld` interface（`get/set/isSolid/bounds`）と `debugTypes.ts`（VoxelDebugAPI/ChunkStats/RaycastHit）の契約凍結。
  - **(凍結対象の網羅・レビュー反映)** 後続が並列で叩く境界 interface も S0 で凍結:
    - **`voxelBuildStore` 公開スキーマ**（`selectedBlockId/tool('place'|'break')/hotbar/fly/history` の型）→ S7 が S2 と真に並列可能になる。
    - **`meshWorker` 入出力メッセージ型**（pad 配列レイアウト=`(SECTION+2)×(CHUNK_SY*SECTION+2)×(SECTION+2)`・`meshRev`・transferable 約定・world-edge=AIR規約）→ メッシャ純関数を安全に並列実装可能に。
    - **`faceShade(x,y,z,faceDir): number` の関数シグネチャ**（S4 の頂点カラー契約）。
  - **(ホワイトリスト)** `docs/voxel-console-whitelist.md` の初版（§3.3）。
  - **(型スモーク)** `schema-smoke.ts`: 各ドメインのスタブ interface を集約 import するファイル。`tsc -b` がこれを型チェックすることで「型エラー0」を機械検証可能にする（レビュー反映）。
- **受け入れ基準（数値）**: `npm run build`（**strict:true 下で**）成功。`npm run test` で `coords.test.ts` 全通過（`worldToChunk(-1,_).cx===-1`、`worldToLocalX(-1)===15`、往復変換が全整数で一致＝境界 0/15/16/-1 網羅）。BLOCKS 配列の id がインデックスと一致（AIR===0）。`schema-smoke.ts` が型エラー0でコンパイル。メモリ予算メモ（§0.1 メモリ予算）を docs 化。
- **E2Eシナリオ**: ブラウザ不要中心。`npm run test`（vitest）を Bash 実行＝coords 往復全通過。`schema-smoke.ts` の `tsc -b` 通過。最後に `browser_navigate` でビルド成果物がリスト外 error 0 で起動することを確認。
- **自己改善ループ（固有収束）**: coords 往復テスト全通過 + strict下 build 成功 + vitest 成功 + `schema-smoke.ts` 型エラー0。**非収束時[C]**: なし（S0は近道不可の起点。凍結項目を削るのは禁止）。

### S1 チャンク格納 + 静的1チャンク face culling 描画 + perf配線〔2・順次（背骨）・S0依存〕
- **目的**: 「voxel が画面に出る」最小の遊べる版。1チャンク分の手置き地面が face culling で描画される。fps/tris/drawCalls の計測経路を実配線。
- **作業**:
  - `Section.ts`: palette+`Uint16Array indices`、単一state時 `indices=null`、`nonAirCount`/`dirty` 管理。`get/set/isEmpty`。Three非依存。
  - `Chunk.ts`: 垂直 `SECTIONS_Y` 個 Section を遅延確保、`meshDirtySections` 集合。
  - `VoxelWorld.ts`: `chunks Map`、`getBlock/setBlock`（唯一の書き込み口）、境界検証、dirty伝播 listener、`markDirty`。
  - `voxelStore.ts`(zustand 薄通知層): `world` 参照・`selectedBlock`・`mode`・`meshVersion` カウンタのみ。
  - `greedyMesher.ts`: 初期は純関数 **face culling**（`solid(here) && !solid(neighbor)` の面のみ）。隣接判定は `VoxelWorld.getBlock`。Worker境界interfaceを切る（S0契約準拠）。
  - `ChunkMeshManager.ts`(imperative) + `VoxelWorld.tsx`(R3F、`return null`): **scene にマウントした単一親 group へメッシュを attach**（matrixWorld/フラスタム/影を正しく継承・レビュー反映）。`meshVersion` 購読、dirty section の `BufferGeometry` 再構築、`computeBoundingSphere`、`geometry.dispose()` 徹底、`MeshLambertMaterial`。1セクション=1メッシュ。**tris/totalVertices を自前合算して `perf.ts`/`getChunkStats` に供給**（§3.0）。
  - **(perf配線)** `Player.tsx` の `fpsRef` を `perf.ts` レジストリへ登録。`gl.info.autoReset=false` を設定し drawCalls キャプチャ経路を確立。
  - **(影)** `App.tsx` の `directionalLight` shadow camera 境界を **128×128 voxel ワールド用に再調整**（現状±44=obbyサイズ／実ファイルで確認）。
  - **(併存)** Physics配下に `<VoxelWorld/>` を追加（PlacementSystem とフラグ切替）。voxel モードでは **PlacementSystem の透明地面 onPointer 平面を無効化**。`setupVoxelDebug()` を `setupBuildDebug()` 隣で呼ぶ。
  - 起動時に 16×16 の床を手置き（プリセット）。
- **受け入れ基準（数値）**: `getChunkStats().loaded>=1` かつ `sections == loaded×(64/16)`。`getPalette` で単一ブロックセクションの `palette.length==1`。平坦16×16床: face culling後 `tris ≤ 12`（上下露出面のみ・内部面0）。`setBlock(0,0,0,grass)` 後 `getBlock(0,0,0)===grass` かつ `count()` +1。`getFps()` が perf.ts 経由で値を返し `≥ 50`（デスクトップ基準）。`drawCalls` が数値で取得できる。リスト外 console error 0。
- **E2Eシナリオ**:
  1. `browser_navigate(:5173)` → `browser_wait_for(()=>!!window.__game?.voxel)`
  2. `browser_console_messages` → リスト外 error 0
  3. `getChunkStats()` → loaded/sections/tris assert（平坦床 tris≤12）・drawCalls が数値
  4. `setBlock(0,1,0,grass)` → `getBlock` assert → `assert((await waitForMeshIdle())===true)` → tris 増加
  5. `getFps()>=50`（perf.ts 経路確認）
  6. `browser_take_screenshot`（非ブロッキング・草の床）
- **自己改善ループ（固有収束）**: 平坦床 tris≤12 再現（内部面0）+ dirty==0 + fps/drawCalls がフックから取得可 + リスト外 error 0。**非収束時[C]**: なし（計測基盤は S8 ベースラインの前提。省略不可）。

### S2a 設置/破壊（DDA raycast）+ 局所再メッシュ + ストア + 照準〔2・順次（背骨）・S1依存〕
- **目的**: マイクラの核「面を狙って積む/壊す」のデータ・描画側を成立（衝突は S2b）。固定アングルカメラでも面を狙える照準モデルを確定。
- **作業**:
  - `raycast.ts`: Amanatides-Woo DDA `raycastVoxel(origin,dir,maxDist,isSolid)→{cell,normal,placeCell,distance}`。純関数・Three非依存。`REACH=6`。
  - **(照準モデル・レビュー反映)** 既存カメラは固定アングルで回転しない（`Player.tsx` 確認）。よって「カメラ前方レイ」だけでは面選択ができない。**操作可能なターゲットを採用**: 地面/面への `unproject` によるタップ・ターゲット（build システムの `e.point` と同方式）を主経路とし、`raycastVoxel(camera前方)` は補助。S7 のタッチ unproject と**同一ターゲット源**を共有する。
  - `VoxelInteraction.tsx`: useFrame で照準→ゴースト/対象面ハイライト（太い枠）。タップ/長押しで place/break。占有/bounds判定（プレイヤー/カメラ占有セルに置かない）。
  - `voxelBuildStore.ts`: S0 凍結スキーマ（`selectedBlockId/tool/hotbar/fly/history`）を実装。set/break を集約。
  - 設置/破壊→`VoxelWorld.setBlock`→境界voxelなら隣接 markDirty→該当 section のみ再メッシュ（`remeshCount` 加算）。
  - `debug.ts`: `placeBlock/breakBlock/raycastVoxel/setTool/selectBlock/undo/getProjectedCell` 露出。
- **受け入れ基準（数値）**: `selectBlock(ishi); placeBlock(hit.prev)` で `getBlock(prev)===ishi`・`count()` +1・`tris` 変化。`breakBlock(cell)` で `getBlock===AIR`・`count()` -1・隣接 solid 面復活で tris 増。2×2×2の塊で内部隠面0（`meshTriangles` が naive全面48三角の半分以下）。プレイヤー占有セル place→false。bounds外 place→false。`undo` で元に戻り `historyLen` 整合。`raycastVoxel`/`getProjectedCell` の当たりセルが一致（照準一貫性）。`fps≥50`。
- **E2Eシナリオ**:
  1〜3. 起動/error0/初期stats（テンプレ）
  4. `teleport` で既知ブロック前へ→`raycastVoxel(null,null)` → cell/normal/prev 期待値
  5. `placeBlock(prev,ishi)` → getBlock assert → `assert((await waitForMeshIdle())===true)` → tris assert
  6. `setTool('break'); breakBlock(cell)` → AIR assert → tris増
  7. 占有/bounds外 place → false assert（誤操作耐性）
  8. クリック注入「ゲーム操作経由 place」が同じ getBlock 経路 + `getProjectedCell` と一致
- **自己改善ループ（固有収束）**: 設置/破壊/undo の数値往復一致 + 内部隠面0 + 照準セル一致 + dirty==0 + error0。**非収束時[C]**: 照準が破綻するなら build モード限定のカメラ yaw 許可（自由視点導入の回帰リスクを明示）。

### S2b 衝突（ColliderDesc.voxels）+ ecctrl 接地安定 + 順序契約〔1.5・順次（背骨）・S2a依存〕
- **目的**: voxel地面の上を安全に歩ける。研究§6.2 の定石（chunk配列直引き）に沿い、Rapier 0.19.2 ネイティブ voxel collider を採用。
- **作業（レビュー反映・衝突戦略を再評価）**:
  - **`VoxelCollision.ts`: チャンク単位 voxel collider**。Rapier 0.19.2 が持つ `ColliderDesc.voxels(Int32Array, voxelSize)`（`node_modules/.../collider.d.ts:633` で確認）を**1チャンク=1 collider**として登録。Section の solid voxel grid 座標を `Int32Array` に組んで供給。編集時は `setVoxel`/`propagateVoxelChange` で**該当チャンクのみ増分更新**（個別 cuboid の大量生成/破棄は採らない＝メモリ・再生成ホットスポット回避）。
  - **(順序契約・レビュー反映)** ecctrl は下向き float-ray/shapecast で接地（`groundDetection`/`floatHeight`/`standCollider` を実型で確認）。以下を契約化:
    - プレイヤーの**現在＋隣接セクションの collider は同期生成**（編集も同期反映＝place/break の衝突レイテンシ0フレーム）。遠方のみデバウンス。
    - `teleport`/respawn は **`waitForCollidersIdle()` で collider 準備完了を gate**（spawn 時の float-ray すり抜け＝めり込み/落下防止）。
  - `debug.ts`: `waitForCollidersIdle` 露出。
- **受け入れ基準（数値・レビュー反映で厳密化）**: 階段状に置いた上に `teleport` → `await browser_wait_for(500ms相当)` → `getState().playerPos.y` が `[expectedFloorTop + capsuleHalfHeight - 0.05, +0.05]` レンジに収まる。`setMovement(forward)` を 800ms 維持 → `playerPos.y` が +1.0±0.2 増（1セル段差を登れる）かつ落下していない（y > 初期-0.1）。place した直後（同フレーム）にその上に `teleport` → N≤6フレームで `getState().isOnGround===true`。`fps≥50`。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. 階段設置→`teleport`→`assert((await waitForCollidersIdle())===true)`→500ms待機→`playerPos.y` が期待レンジ assert
  5. `setMovement(forward)` 800ms→`playerPos.y` +1.0±0.2 増 + 非落下 assert（段差登坂）
  6. プレイヤー直下に place→N≤6フレームで `isOnGround===true` assert（同期collider）
  7. screenshot（非ブロッキング）+ `fps≥50`
- **自己改善ループ（固有収束）**: 接地レンジ内安定（めり込み/落下0）+ 段差登坂 + 同期collider で isOnGround + dirty==0 + error0。物理揺らぎは許容幅とリトライ回数で吸収。**非収束時[C]**: ecctrl を捨て自前 voxel-AABB sweep に全置換（研究§6.2 が定石とする方式・移動/ジャンプ/坂の全回帰が必要なことを明示）。

### S3a 複数チャンク + 境界 markDirty 厳密化（メインスレッドmesh）〔2・順次（背骨）・S2b依存〕
- **目的**: 固定8×8チャンクの世界を成立。チャンク境界で穴/余分内面が出ない。メッシュはまだメインスレッド。
- **作業**:
  - 8×8チャンクをロード（固定ワールド）。`VoxelWorld.setBlock` の境界voxel変更時の隣接チャンク/セクション markDirty を厳密化（角は最大3チャンク波及）。
  - voxel collider もチャンク境界整合（S2b の増分更新を 8×8 で検証）。
  - **(world-edge規約)** ワールド端チャンクの隣接=AIR（開いた境界）を S0 契約通り適用し、端で見えない壁/穴が出ないことを確認。
- **受け入れ基準（数値）**: `getChunkStats().loaded==64`。境界（x=15とx=16）に隣接設置→両セクションが dirty 化し境界内側面が消える（`meshTriangles` で確認）。1ブロック変更で `dirtySections()` が該当±隣接のみ（全セクションでない）。50回設置ループ→`assert((await waitForMeshIdle())===true)`→tris安定・`fps≥50`・`drawCalls<=128`。大量設置→破壊後 `totalVertices` 減少（dispose動作）。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. 境界設置 `setBlock(15,1,0,id); setBlock(16,1,0,id)` → waitForMeshIdle===true → 境界内面消失を tris で確認
  5. 局所性: 1ブロック変更後 `dirtySections().length` が小（±隣接のみ）assert
  6. 連打50回 → waitForMeshIdle===true → tris安定・`fps≥50`・`drawCalls<=128`
  7. screenshot（非ブロッキング・複数チャンク）
- **自己改善ループ（固有収束）**: 境界穴/余分内面0 + 局所性（dirtySections小）+ dispose で totalVertices減 + dirty==0 + error0。**非収束時[C]**: なし（境界正しさは忠実コア）。

### S3b Web Worker メッシュオフロード + apron + meshRev stale破棄〔2・順次（背骨）・S3a依存〕
- **目的**: メッシュ生成を Worker へ。研究§7-3 が最大ボトルネック候補に挙げた領域を独立スプリント化。
- **作業（レビュー反映で明確化）**:
  - `meshWorker.ts`(module worker, Vite `new Worker(new URL(...),{type:'module'})`) + `MeshScheduler.ts`(Workerプール 2〜4本・同一chunkKeyジョブ coalescing・`meshRev` stale破棄)。
  - **(apron 明示)** `buildPaddedSnapshot(chunk)` をメインスレッドで実行: 6（AO時26）近傍セクションを `VoxelWorld.getBlock` で読み、**新規 `Uint16Array`** に apron 込みで詰める（live `Section.indices` を transfer すると権威データが detach するため**copy-then-transfer**）。world-edge=AIR。`meshRev` は**スナップショットに刻印**（飛行中の隣接編集を検出）。
  - 結果到着時 `result.meshRev===chunk.meshRev` のみ採用。`geometry.dispose()` 徹底。SAB は実行時判定でフォールバック（MVPは transferable）。
  - **(性能基準の正直化)** 研究の 74us/chunk は単スレッド C(Ryzen 3800x) の値。**JS-in-Worker・タブレットの期待値として流用しない**。S1/S8 で実測した JS ベースラインを基準にする。
- **受け入れ基準（数値）**: 境界設置→`waitForMeshIdle()===true`→両チャンクの内面消失を tris で確認。連続設置多数→最終 tris 安定・stale 結果のちらつき無し（`meshRev` 照合）・dirty==0・`fps≥50`。`vite build` が Worker バンドルを含めて成功。リスト外 console error 0（Worker module 警告はホワイトリスト管理）。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. 境界設置 → waitForMeshIdle===true → 内面消失 tris assert
  5. 50回設置ループ → waitForMeshIdle===true → tris安定・ちらつき無し・`fps≥50`・`drawCalls<=128`
  6. `npm run build` 成功（Worker バンドル）を別途確認
  7. screenshot（非ブロッキング）
- **自己改善ループ（固有収束）**: 境界穴/余分内面0 + stale結果ちらつき無し（meshRev）+ GPUメモリ解放 + Worker転送破綻（vite build失敗含む）0 + dirty==0 + error0。**非収束時[C]**: Worker をやめてメインスレッドメッシュに据置（タブレットでメインスレッド長時間ブロックによる入力カクつきリスクを明示）＝§5[B] の後送りへ降格。

### S4a ライティング（sky/block add伝播）+ 頂点カラー〔2・順次（背骨）・S3b依存〕
- **目的**: 「マイクラらしい見た目」の核（追加伝播）。sky/block light を分離し BFS add 伝播、頂点カラーに焼く。
- **作業**:
  - `light/LightStore.ts`: セクション毎 `blockLight/skyLight`(Uint8Array×2)、遅延生成。
  - `light/propagate.ts`: push型 **add 伝播**コア（Starlight的1近傍確認）。
  - `light/skyLight.ts`: 上から下 seeding + opacity-0 早期打ち切り + 垂直減衰0特例（直射光柱）。
  - `light/lightHooks.ts`: `setBlock` の add 経路 → dirty セクションを mesher 再メッシュキューへ。`faceShade(x,y,z,faceDir)=clamp(max(block/15, sky/15*dayNightFactor)*0.85+0.15,0,1)`（S0 凍結シグネチャ準拠・最低環境光0.15）。
  - mesher が quad emit 時に `faceShade` を問い合わせ4頂点 color に書く。`MeshLambertMaterial{vertexColors:true}`。
  - **(二重照明回避・数値化)** `App.tsx` の `ambientLight`(現状0.8)/`directionalLight`(現状1.6) を頂点カラー前提に減光。**「二重照明なし」は `getFaceShade` と light フックで数値検証**し screenshot 目視に依存しない（§3.4）。
  - `debug.ts`: `getLight/getFaceShade/waitForLightIdle` 露出。
- **受け入れ基準（数値）**: `await waitForLightIdle()===true`後 `getLight(地表上空).sky===15`、屋内/木の真下が低値。光源設置後、距離 d で `getLight().block==max(0,src-d)` を複数点 assert。`getFaceShade` が単調・下限0.15。屋根設置→真下 `sky` 低下・`remeshCount` 差分が light変化セクション数に一致（局所性）。初期照明 `initMs` < 目標、`addMs<16ms`（デスクトップ）。`fps>50`。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. 初期照明: `assert((await waitForLightIdle())===true)` → `getLight(x,高y,z).sky===15` assert
  5. 光源: ライト設置→waitForLightIdle===true→`getLight().block==max(0,src-d)` 複数点 + `getFaceShade` 単調 assert
  6. 屋根: 天井設置→真下 `getLight().sky` 低下 + `remeshCount` 差分が局所 assert
  7. screenshot（非ブロッキング）+ `fps>50`
- **自己改善ループ（固有収束）**: add 伝播の距離減衰 + faceShade 単調・下限0.15 + 二重照明なし（数値）+ remesh 局所性 + dirty==0 + add<16ms + error0。**非収束時[C]**: light を別 `BufferAttribute` に分離せず頂点カラー据置のまま、dirty セットを保守的26近傍に広げて正しさ優先（FPS犠牲を明示）。

### S4b remove伝播の完全復帰 + 二重照明調整〔1.5・順次（背骨）・S4a依存〕
- **目的**: ライティング最難所。撤去→設置前と同値へ完全復帰（暗いシミ0）。計画自身が§5の代表的分岐点に挙げた難所を独立スプリント化（レビュー反映）。
- **作業**:
  - `light/propagate.ts` に **remove 伝播コア**（暗くする波及 + 境界の再注入＝周囲のより明るい光源から再 add）を追加。Starlight的に「より明るい近傍があれば再充填」を正しく実装。
  - 設置（不透明化）= remove、破壊（透明化）= 周囲から add 再注入。dirty セクション（実際に lit AABB が変わった範囲）を再メッシュキューへ。
  - **(性能・レビュー反映)** 縦穴掘削で skyLight が縦スタックを一括再ライティング+再メッシュする最悪ケースを定量化（最大再メッシュセクション数 と ms をデスクトップ＋**CPUスロットル Playwright** で計測）。
- **受け入れ基準（数値）**: 光源設置→`waitForLightIdle()`→撤去→`waitForLightIdle()===true`→**設置前と全測定点で同値**（remove の正しさ・暗いシミ0）。`removeMs<16ms`（デスクトップ）。縦穴掘削の最悪ケース再メッシュセクション数と ms を記録（しきい値内）。`fps>50`。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. 復帰: 光源設置→waitForLightIdle→測定点記録→撤去→waitForLightIdle===true→設置前と同値 assert（完全復帰）
  5. 縦穴: 縦8ブロック掘削→waitForLightIdle===true→`remeshCount` 差分と所要 ms を記録・しきい値 assert
  6. CPUスロットルでの `fps`/`removeMs` 測定（タブレット近似）
  7. screenshot（非ブロッキング・木陰/明暗）
- **自己改善ループ（固有収束）**: 撤去→元の明るさ完全復帰（暗いシミ0・数値一致）+ removeMs<16ms + 縦穴最悪ケースしきい値内 + dirty==0 + error0。**非収束時[C]**: remove 伝播を諦め「設置/撤去時に影響 AABB を全再ライティング（local rebuild）」へ。再ライティング範囲が広がり光更新が重くなる性能犠牲を明示。

### S5 地形生成（noise / 2D高さ場 / バイオーム / 木）〔2・S1依存・S4統合は順次・S6/S7と並列可〕
- **目的**: 決定論的な固定小規模ワールドを自動生成。手書きノイズで density>0=solid を代替。
- **作業**:
  - `worldgen/noise.ts`: seed付き value/gradient noise + fBm 自前実装（simplex を npm追加しない・最小依存）。
  - `worldgen/terrain.ts`: 既定=2D高さ場 `h=floor(SEA+fbm(x,z)*AMP)`、土/石/草/水の層分け。3D density（オーバーハング）は既定OFF・フラグ。固定 8×8・Y=0..63。
  - `worldgen/biome.ts`: temperature×humidity で4種（草原/砂漠/雪原/森）→色・木種のみ（shape不干渉）。
  - `worldgen/structures.ts`: 木/花のデータ駆動 stamp・決定論散布。葉は opacity=1（S4 sky light 減衰でやわらかい木陰）。
  - `worldgen/generate.ts`: `generate(seed)`: 地形→着色→構造物→**一括ライティング(S4)**→初回メッシュ の順次オーケストレータ。**S4 確定 API に依存する順次統合点**（§2.1）。
  - `debug.ts`: `loadSeed/snapshot(決定論ハッシュ文字列)/world.height/world.biome` 露出。
- **受け入れ基準（数値・レビュー反映で比較方法明確化）**: 同一 seed で2回 `generate`→`snapshot()` が返す**決定論ハッシュ文字列が `===` 一致**（`snapshot()` は全チャンクの palette+indices を連結した FNV/SHA。TypedArray を含む構造を `debugTypes` 規定の方法でシリアライズ）。起伏/海面存在（高さ場 min/max 差>0）。4バイオームの色分け存在。木陰: `await waitForLightIdle()===true`→葉真下 `getLight().sky < 周囲`（S4統合検証）。`fps>50`、リスト外 error 0。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. 決定論: `loadSeed(1); const a=snapshot(); resetWorld(); loadSeed(1); const b=snapshot();` → `a===b` assert（ハッシュ文字列）
  5. 地形: `world.height(x,z)` が複数点で変化 assert
  6. 統合: `assert((await waitForLightIdle())===true)` → 葉真下 `getLight().sky < 周囲` assert
  7. screenshot（非ブロッキング・起伏/水/木/バイオーム色）+ `fps>50`
- **自己改善ループ（固有収束）**: 決定論ハッシュ一致 + 木陰の S4 統合成立 + fps>50 + error0。**非収束時[C]**: ノイズ単調化（質不足）は simplex 追加を §5[B/C] で提示（勝手に追加しない・最小依存方針からの逸脱を明示）。

### S6 IndexedDB 永続化〔1.5・S1依存・S5/S7と並列可〕
- **目的**: 子供が作った世界が次回も残る（NBT/Anvilのweb置換）。
- **作業**:
  - `persistence.ts`: DB `kids-voxel` / store `chunks`(key=`cx,cz`)。1レコード=1チャンク `{cx,cz,sections:[{palette,indices,nonAirCount}],schemaVersion}` を構造化クローン保存。**`indices` は standalone Uint16Array 不変条件（S0凍結）を遵守**しクローンを曖昧にしない。
  - 保存トリガ: setBlock後デバウンス（1.5s）で dirtyチャンクのみ書込。`getPersistStats().writes` で計測。
  - ロード: 起動時に固定64レコード一括読込→VoxelWorld へ流し込む。**`schemaVersion` のマイグレーションパスを定義**（フィールド存在のみでなく load 時の version 分岐・レビュー反映）。
  - `debug.ts`: `persistFlush()/getPersistStats()` 露出。
- **受け入れ基準（数値）**: set数個→`persistFlush()`→`browser_navigate` 再読込→`count()`/`getBlock` 同値。デバウンス中の連打で `getPersistStats().writes < set回数`。`schemaVersion` が各レコードに存在しマイグレーション分岐が通る。リスト外 error 0。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. `setBlock` 5個 → `await persistFlush()` → `getPersistStats().writes < 5` assert（デバウンス）
  5. `browser_navigate(:5173)` 再読込 → `browser_wait_for(voxel)` → `getBlock` 5個同値・`count()` 一致 assert
  6. screenshot（非ブロッキング・再読込後も同じ世界）
- **自己改善ループ（固有収束）**: リロード往復で count/getBlock 完全一致 + デバウンス効果（writes<set数）+ マイグレーション通過 + error0。**非収束時[C]**: TypedArray を base64 文字列化して保存（クローン破綻回避だが容量・速度犠牲を明示）。

### S7 子供向けUX / ホットバー / タッチ / undo / 飛行〔2・S0(store凍結)後・S5/S6と並列可〕
- **目的**: 5歳が安全・直感的に操作（タップ・ターゲット・タッチ・誤操作耐性・任意飛行）。
- **作業（飛行をecctrl実態に合わせて全面改訂・レビュー反映）**:
  - `ui/HotbarUI.tsx`: 画面下4〜6スロット+「こわす」トグル+「とぶ」トグル+「もどす」。data-testid 付与。既存 `BuildUI` の Toolbar/InventoryPanel を踏襲。
  - デフォルト=設置、長押し or こわすモードで破壊。常時ゴーストプレビュー（緑/赤）。連打デバウンス。
  - **クリエイティブ飛行（ecctrl 2.0.0 実態に基づく専用コントローラ）**: 検証の結果 ecctrl `EcctrlProps` に `gravityScale`/`kinematic`/`fly` プロパティは**存在しない**（実型確認・あるのは `enable`/`enableCustomGravity`/`fallingGravityScale`）。よって飛行は**プロップ・トグルではなく専用飛行コントローラ**として実装:
    - 方式(a): 飛行時 `enable={false}` にして ecctrl の毎フレーム impulse を止め、`handle.body` を `kinematicPositionBased` に切替（または dynamic + gravityScale 0）、`getKeys()`/タッチ上下ボタンから body を直接駆動。
    - 方式(b): `enableCustomGravity` を使い重力を0化（こちらが存在するプロップ）。
    - どちらでも「飛行中の専用移動経路」が必要。**1.5→2.0 セッションへ補正済み**（トグルではなくコントローラ実装）。
    - 飛行トグル時にカメラがスナップ/プレイヤーが弾かれない（ecctrl 再有効化で float spring が再着座する）ことを保証。
  - 数字キー/タップでホットバー選択。タッチは S2a と**同一の unproject ターゲット源**を共有。
  - `debug.ts`: `selectBlock/setTool/setFly/getState(selectedBlockId,tool,fly,hotbar,blockCount,historyLen)` 露出。
- **受け入れ基準（数値）**: 数字キー `KeyboardEvent` で `getState().selectedBlockId` 切替。`setTool('break')` で tool=='break'。`setFly(true)`→上昇入力で `playerPos.y` 増・落下しない、`setFly(false)` で接地。**飛行トグルを空中で行ってもカメラがスナップせずプレイヤーが弾かれない**（トグル前後で `cameraPos`/`playerPos` の不連続が許容内）。タッチ（クリック注入）で設置が getBlock 経路を通る。タブレット幅で UI 崩れない（resize後 `getProjectedCell` ベースのレイアウト assert＋screenshot は非ブロッキング）。`undo` で `blockCount` 整合。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. `browser_press_key('Digit2')` → `getState().selectedBlockId` 切替 assert
  5. クリック注入 place → getBlock assert（タッチ経路）
  6. `setFly(true)`→上昇→`playerPos.y` 増 assert → 空中トグル不連続が許容内 assert → `setFly(false)` 接地 assert
  7. `browser_resize`(タブレット幅) → レイアウト数値 assert + screenshot（非ブロッキング）
- **自己改善ループ（固有収束）**: 全操作（選択/設置/破壊/飛行/undo）数値検証 + 飛行トグルの不連続なし + 落下死なし + UI崩れなし + error0。**非収束時[C]**: 飛行を「重力0固定の常時飛行モード（接地歩行を捨てる）」に簡略化（歩行体験喪失を明示）。

### S7.5 並列トラック結合スモーク（S5+S6+S7）〔0.5・順次（統合）・S5,S6,S7依存〕
- **目的**: 並列で作った3トラックが初めて噛み合う結合バグを S8 前に吸収（レビュー反映・S8への集中を緩和）。
- **作業**: S5 生成済みワールド上で S6 永続化往復 + S7 UX設置/破壊を通す軽量スモーク。生成チャンクの二重保存・UX設置が worldgen 由来ブロックを壊す境界・飛行中の collider 整合を点検。
- **受け入れ基準（数値）**: `loadSeed`→生成→S7経路で数個設置/破壊→`persistFlush()`→`browser_navigate` 再読込→`count()`/`getBlock` が（生成+編集後の）期待値と一致。`getPersistStats().writes` が生成チャンクを二重保存していない（チャンク数以下）。リスト外 error 0。
- **E2Eシナリオ**: 上記を1本のシナリオで通し assert。screenshot は非ブロッキング。
- **自己改善ループ（固有収束）**: 生成+編集+永続化往復の数値一致 + 二重保存なし + error0。**非収束時[C]**: なし（統合の正しさは省略不可。問題は S8 に持ち越さず本スプリントで収束）。

### S8 仕上げ・性能・greedy/AO・昼夜(任意)・統合〔2・S4b,S5,S6,S7.5依存・順次（統合）〕
- **目的**: 性能ベースライン固定・見た目向上・全レイヤー統合の検証。
- **作業**:
  - `greedyMesher.ts` を face culling から **greedy meshing へ差し替え**（純関数なので差し替え容易・忠実コアの face culling は維持したまま最適化・§0.2）。
  - `ENABLE_AO` オプトイン: per-vertex 4近傍 occupancy から3段AO、mergeキーに aoCode を含める。`setAO(bool)` フック。**apron を AO用26近傍に拡張**（S3b の `buildPaddedSnapshot` 引数）。
  - `dayNight.ts`(任意): time 0..1、`dayNightFactor` 下限0.35。**skyLight 格納は不変＝表示倍率のみ**（再BFS/再メッシュ不要）。App.tsx の Sky/light を store駆動。`setTime` フック。
  - **(ベースライン固定)** FPS/tris/drawCalls/`heapUsed`/`totalVertices` の実測ベースラインを**デスクトップ＋CPUスロットル（タブレット近似）両方**で確定→以降の回帰しきい値に固定。
  - PlacementSystem との併存トグル整理（voxel主役・build はかざりモード）。
- **受け入れ基準（数値）**: 同一 block の平面16×16で greedy後 `tris << ブロック数×12`（矩形統合）。`setAO(true)` 後 tris 増・`setAO(false)` で戻る。昼夜 `setTime(0.0/0.5/0.75)` で `getFaceShade` 単調変化・最小≥0.35・**`remeshCount` 差分==0**（再メッシュ0回・skyLight不変の検証・レビュー反映）。中規模ワールドで `fps≥50`（デスクトップ）かつ CPUスロットル下のベースラインを記録。`drawCalls<=可視チャンク数×係数`。`heapUsed` がメモリ予算内。決定論 snapshot ハッシュ一致を回帰確認。リスト外 error 0。
- **E2Eシナリオ**:
  1〜3. テンプレ
  4. greedy: 16×16平面→waitForMeshIdle===true→`tris << 16×16×12` assert
  5. AO: `setAO(true)`→tris増 / `setAO(false)`→戻る assert
  6. 昼夜: `setTime` 前後で `getFaceShade` 単調・≥0.35・**`remeshCount` 差分==0** assert
  7. 全往復回帰: 設置/破壊/undo/リロード/決定論ハッシュ を通し assert
  8. ベースライン記録（デスクトップ + CPUスロットル）: `fps`/`drawCalls`/`heapUsed`/`totalVertices`
  9. screenshot（非ブロッキング・昼/夜）
- **自己改善ループ（固有収束）**: greedy効果（tris激減）+ AOトレードオフ確認 + 昼夜で remeshCount差分0 + 全往復回帰合格 + fps/drawCalls/heap ベースライン内 + dirty==0 + error0。**非収束時[C]**: AO有効時のFPS低下が許容外なら AO を既定OFF据置（立体感の見た目犠牲を明示）＝§5[B]。

---

## 7. 将来の別ロードマップ（本計画スコープ外・別途検討）

研究 §6.1 後回し列 + 子供向けゴールに従い、以下は**別ロードマップ**として分離（着手前に deep-research 再実行）:
- **テクスチャアトラス / blockstate JSON モデル**（§0.2 の意図的逸脱を将来戻す場合）— 研究の忠実コア「Minecraftらしい見た目」に近づける。
- **サバイバル**（空腹/戦闘/レシピ/Mob AI/死亡）— 子供向けゴールと相反。導入するなら別ゲームモード。
- **マルチプレイ / netcode**（サーバー権威TCP）— 本計画の VoxelWorld 単一権威設計は内部権威モデルの萌芽として整合。
- **レッドストーン / 論理回路** — 別データモデル（tick更新）。
- **無限ワールドストリーミング**（動的ロード/アンロード・LOD・region バッチ/BatchedMesh）— 固定8×8を解く時に着手。座標系・格納方式は拡張可能に設計済み。
- **洞窟 / aquifer / 3D density オーバーハング常用** — 暗い地下を作らない子供方針で当面OFF。
- **bits-per-entry 動的ビットパック / light 4bit packing / パレットGC(compact)** — メモリ最適化。差し替えinterfaceは確保済み。**buffer pool 導入時は standalone buffer へコピーするシリアライザの背後に隠す**（S0 不変条件を破らない）。
- **SharedArrayBuffer コピーレス転送**（COOP/COEPヘッダ）— 計測後のオプトイン。
- **ColliderDesc.voxels の `combineVoxelStates` によるチャンク間連結最適化** — チャンク境界の collider 結合（数千ブロック規模での更なる最適化）。

---

## 8. 進捗トラッカー

| Sprint | 状態 | 依存 | 並列 | プレイテスト | 備考 |
|---|---|---|---|---|---|
| obby基盤＋最初の遊べる版 | ✅ 完了 | — | — | ✅ move/jump/coin/0err | 2サイクル自己改善済み・voxelの土台 |
| S0 共有スキーマ + 品質/計測基盤 | ✅ 完了 | — | 並列禁止 | ✅ vitest 11件 | strict:true追加/vitest導入/perf.ts/coords・collisionテスト |
| S1 チャンク格納＋静的描画＋perf配線 | ✅ 完了 | S0 | 背骨 | ✅ 64chunk/tris141k/dc35 | パレット圧縮・face culling・per-faceシェード頂点カラー |
| S2a raycast＋設置/破壊＋ストア＋照準 | ✅ 完了 | S1 | 背骨 | ✅ place/break/raycast | DDA・クロスヘア照準（一人称）・ハイライト枠 |
| S2b 衝突＋接地 | ✅ 完了 | S2a | 背骨 | ✅ 着地/歩行/ジャンプ | **[C]採用: 自前voxel-AABBスイープ＋一人称（研究§6.2定石）。ecctrl/Rapier非依存** |
| S3a 複数チャンク＋境界markDirty | ✅ 完了 | S2b | 背骨 | ✅ 8×8=64・境界面消失 | メインスレッドmesh・境界±隣接markDirty |
| S3b Workerオフロード＋apron＋meshRev | ⬜ 後送り | S3a | 背骨 | — | §5[B]: メインスレッドmesh据置（小規模ワールドで十分・dc≤36） |
| S4a ライティング add＋頂点カラー | ✅ 完了 | S3a | 背骨 | ✅ sky=15/block距離減衰 | sky/block BFS add伝播・頂点カラー焼込み・MeshBasic二重照明なし |
| S4b remove伝播完全復帰＋二重照明 | ✅ 完了 | S4a | 背骨 | ✅ 撤去で完全0復帰 | remove伝播＋再充填・囲い部屋で実証（sky0→light15→撤去0） |
| S5 地形生成（noise/バイオーム/木） | ✅ 完了 | S1 | S6/S7と並列 | ✅ seed1337決定論 | value-noise fBm高さ場・砂浜/水/木・決定論 |
| S6 IndexedDB永続化 | ⬜ 後送り | S1 | S5/S7と並列 | — | §5[B]: 現状セッション内のみ（固定seedで再現） |
| S7 子供向けUX/ホットバー/飛行 | ✅ 完了 | S0 | S5/S6と並列 | ✅ ホットバー/飛行 | クロスヘア・ホットバー10種・F飛行・debugフック |
| S7.5 並列トラック結合スモーク | ✅ 完了 | S5,S6,S7 | 統合 | ✅ 統合E2E通過 | App統合・全機能同時動作確認 |
| S8 仕上げ・性能・greedy/AO・昼夜 | ⬜ 後送り | — | 統合 | — | §5[B]: greedy/AO/昼夜/タッチ操作は次フェーズ |

> 凡例: ⬜未着手/後送り / 🟦実装中 / 🧪プレイテスト中 / ✅完了
> 各スプリント完了の定義: 受け入れ基準（数値）全合格 ＋ リスト外 console error 0 ＋ dirty==0 ＋ `npm run build`(strict:true) 成功 ＋ `npm run test` 成功 ＋ self-improvement loop 収束記録。
> 背骨（順次・短縮不可）合計: 約18セッション。並列トラック（S5/S6/S7）は背骨と同日消化想定。
>
> ### 実装ログ（2026-06-18 セッション）
> - **遊べるコア完成**: チャンク/パレット格納 → face culling描画 → 設置/破壊 → 自前衝突の一人称操作 → 8×8地形生成 → ホットバーUX を順次実装し、単体で遊べる Minecraft クローンとして成立。
> - **衝突の方針決定**: openConcern #1（ecctrl×ColliderDesc.voxels の接地が実機未検証）を踏まえ、研究§6.2が定石とする**自前 voxel-AABB スイープ＋pointer-lock 一人称**を採用（[C]）。ecctrl/Rapier に依存せず、collision.ts は純関数でユニットテスト済み。
> - **ライティング方針**: フルBFS光エンジン（S4a/S4b）は §5[B] で後送りし、メッシャが焼く per-face ディレクショナルシェード（頂点カラー）＋ ambient/directional で「本家風の面陰影」を低コストに実現。
> - **自己改善サイクル**: 1反復で収束（天井衝突の大ステップ取り違え → moveAndCollide のサブステップ化 → vitest/build/E2E 全green）。
> - **検証実績**: vitest 11件通過 / strict build 通過 / Playwright E2E（設置破壊・移動3.5m・ジャンプ0.94・高所からの落下着地・raycast面法線・bounds/プレイヤー重なり拒否・fps120・drawCalls≤35・console error 0[THREE.Clock warnのみホワイトリスト]）通過。
>
> ### 実装ログ（2026-06-18 セッション #2 — S4 ライティング）
> - **S4a/S4b フルBFSライティング完成**: block light（発光ブロック seed）と sky light（カラム上から15・直下満タンは減衰なしの直射光柱）の add 伝播、および **remove 伝播（撤去で取り残しの明かりゼロ＝最難所）+ より明るい近傍からの再充填**を `light.ts` に実装。`Section` に `blockLight/skyLight`(Uint8Array・遅延確保)、`VoxelWorld.onBlockChange` フックでインクリメンタル更新。
> - **頂点カラー焼込み + 二重照明回避**: メッシャが各面の露出側セルの `max(sky,block)` 光を `lightToFactor`（最低環境光0.12）× face shade で頂点カラーに焼く。マテリアルを `MeshLambertMaterial`→`MeshBasicMaterial`（vertexColors）に変更し、シーンの ambient/directionalLight を撤去（光は頂点カラーに完全に焼込み済み＝二重照明なし）。
> - **検証（囲い部屋シナリオで本質を実証）**: vitest 15件通過（block距離減衰 D1=14/D3=12/D5=10、remove後 完全0復帰、2光源で片方撤去しても他方の寄与は残存）。E2E: 屋根で sky=0→真っ暗、ライト設置で中心 block=15・角13、**撤去で block=0 完全復帰**。屋外は sky=15 支配の自然な陰影。fps120・drawCalls≤36・dirty=0・console error 0。
> - **自己改善サイクル**: エンジン側の修正は0反復で収束（初回で全ゲート通過）。唯一の不一致は「開けた空中での faceShade 単調性テスト」がテスト設計ミス（屋外は sky=15 支配で飽和するのが正）と判明し、囲い部屋シナリオに置換して実証した。
>
> ### 実装ログ（2026-06-19 セッション #3 — 視覚向上: テクスチャ＋AO）
> - **動機**: ユーザーから「ベタ塗りでノッペリ。本物はピクセル調で立体的」という指摘。原因は (1) 1面=単色、(2) AO無効 の2点と特定。
> - **手続き生成ピクセルアート・テクスチャアトラス**（`atlas.ts`）: 外部画像を使わず（著作権回避・子供向けに自前アート）、4×4 の 16×16px タイルをコードで描画（草/土/草側面/石/砂/木上/木側/葉/レンガ/にじ/ガラス/くも/水/ライト）。決定論ノイズで粒立て、レンガ模様・木の年輪・草側面の縁などを描く。`THREE.CanvasTexture` + `NearestFilter`（ぼかさずカリッとしたドット絵）+ `generateMipmaps:false` + `flipY:false`。
> - **メッシャ刷新**（`mesher.ts`）: UV を追加（per-face タイル割当 top/bottom/side）。**頂点アンビエントオクルージョン**（3近傍遮蔽で角を暗く＝立体感）を実装し、AO に応じて四角形の対角分割を反転（光のにじみ軽減）。頂点カラーは色相をやめ「明るさスカラー(brightness=faceShade×light×AO, r=g=b)」に。`MeshBasicMaterial{map, vertexColors}` が `texture.rgb × brightness` で合成（二重に色を掛けない）。`ENABLE_AO=true`。
> - **検証**: vitest 15件通過（mesher は純関数のまま・既存テスト不変）/ strict build 通過 / E2E: 64chunk・tris141k・drawCalls≤40・fps120（定常）・dirty0・console error 0。スクショで草/土側面/石/砂/レンガ/木のテクスチャと崖根元の AO 陰影を目視確認。ライティング（💡）も継続動作。
> - **自己改善サイクル**: 1反復で収束（`Ctx` 型が DOM `CanvasRenderingContext2D` と非互換 → `fillStyle` を union 型に修正）。

---

## 9. レビュー指摘への対応（採否と理由）

**全 critical / major は反映済み**。対応サマリ:

| 指摘 | 重要度 | 対応 |
|---|---|---|
| strict 不在（品質ゲート形骸化） | critical | **反映**: S0 で `strict:true` 追加（§0.1-A）。ゲート文言を正確化 |
| vitest 未導入（S0テスト実行不能） | major/critical | **反映**: S0 で vitest 導入・ゲート1.5 追加（§0.1-B） |
| tris/drawCalls 取得元未定義 | critical | **反映**: §3.0 計測契約（自前合算 + autoReset=false） |
| getFps() レジストリ不在 | critical | **反映**: §3.0 + S1 で perf.ts レジストリ登録 |
| 衝突が研究矛盾＋ColliderDesc.voxels無視 | critical | **反映**: S2b で ColliderDesc.voxels 採用（実型確認済み）。個別cuboid不採用 |
| ecctrl 飛行プロップ不在 | critical | **反映**: S7 で専用飛行コントローラに改訂（実型確認済み）・1.5→2.0補正 |
| S2/S3/S4 過小見積もり | major | **反映**: S2a/S2b・S3a/S3b・S4a/S4b に分割。総量16.5→約18(背骨) |
| ecctrl float-ray vs collider 順序 | major | **反映**: S2b 順序契約 + `waitForCollidersIdle` |
| Worker apron/pad-copy 未定義・74us流用 | major | **反映**: S3b で buildPaddedSnapshot 明示・copy-then-transfer・74us流用禁止 |
| light-mesh 結合のタブレットFPSリスク | major | **反映**: S4a/S4b で CPUスロットル計測・[C]に attribute分離/保守的dirty |
| メモリ予算未記載 | major | **反映**: §0.1 メモリ予算 + getChunkStats に heapUsed/totalVertices |
| S5/S7 隠れた順次依存 | major | **反映**: S4→S5統合の順次エッジ明示・S0でvoxelBuildStore凍結 |
| screenshot主観で収束破る | major | **反映**: §3.4 screenshot を非ブロッキング化・収束条件から除外 |
| S2b「安定」フレーム数曖昧 | major | **反映**: S2b で待機ms/期待レンジ/許容誤差を数値固定 |
| faceShade 直接検証経路なし | major | **反映**: `getFaceShade` フック追加 |
| waitForMeshIdle/LightIdle 契約緩い | major | **反映**: §3.1 で timeout既定/resolve規約/必ず===true assert |
| S0「矛盾なくimport」手順不明 | major | **反映**: `schema-smoke.ts` で tsc -b 機械検証 |
| 3択[C]がスプリント未紐付け | minor | **反映**: 各スプリント末尾に「非収束時[C]犠牲」を1行明記 |
| 合計セッション数の楽観 | minor | **反映**: §2.3 で背骨18を切り出し二段表記 |
| S0 凍結対象の網羅性 | minor | **反映**: voxelBuildStore/meshWorker契約/faceShade を S0 凍結対象に追加 |
| console error ホワイトリスト未確定 | minor | **反映**: S0/S1 で docs 成果物化 |
| S6 デバウンス観測経路なし | minor | **反映**: `getPersistStats()` 追加 |
| S8 再メッシュ0回 metrics なし | minor | **反映**: `remeshCount` 累積カウンタ追加 |
| snapshot 比較方法未定義 | minor | **反映**: 決定論ハッシュ文字列＋`===`比較 |
| タッチ unproject 決定論検証不足 | minor | **反映**: `getProjectedCell` + S7 決定論手順 |
| 並列トラック統合E2EがS8集中 | minor | **反映**: S7.5 結合スモークを独立スプリント化 |
| greedy がコア/後送りで矛盾 | minor | **反映**: §0.2 で「face culling=コア、greedy=最適化(S8)」と整理 |
| テクスチャ非採用が暗黙 | minor | **反映**: §0.2 で意図的逸脱と明記 |
| TypedArray clone view危険 | minor | **反映**: S0 不変条件（standalone Uint16Array） |
| raycast 固定カメラで面選択不能 | minor | **反映**: S2a で unproject ターゲット源を主経路化 |
| R3F return null の影/フラスタム手動 | minor | **反映**: S1 で scene-mounted group へ attach・shadow camera 再調整 |
| schemaVersion マイグレーション未定義 | minor | **反映**: S6 でマイグレーション分岐定義 |

**据え置き（却下）はなし。** 全指摘を計画本文へ反映した。唯一、研究が忠実コアに挙げる「テクスチャ」と「greedy meshing をコアとして前倒し」については、**却下ではなく §0.2 で意図的な解釈・逸脱として明文化**する形で扱った（テクスチャ=5歳児アートディレクションの意図的逸脱で将来ロードマップ／greedy=face cullingをコアとし最適化をS8）。これは「品質>スコープ削減」の優先順位に沿い、忠実コアの存在要件（face culling）を一切省略していないため、近道の第一選択化には当たらない。