# Minecraft 技術・構造調査（クローン開発のための網羅調査）

> 本家 Minecraft（主に **Java Edition 1.18+ モダン仕様**）が「どういう仕組みのゲームで、内部的にどう構築されているか」を、実装言語に依存しない中立的視点で調査したもの。
> 最終ゴールは **Web（Three.js + React Three Fiber + TypeScript + Rapier）での子供向けクリエイティブ寄りクローン**。各システムに「忠実なクローンに必須のコア」と「後回し・簡略化できる部分」を併記する。
>
> **検証方法**: ディープリサーチ（5検索アングル → 23ソース取得 → 110主張抽出 → 上位25主張を3票の敵対的検証 → **23確定 / 2棄却**）。各主張に確信度と投票結果・一次/二次ソースを付す。`docs/research-roblox-mechanics.md` と同じ「3票検証済み」基準。
> 調査日: 2026-06-17

---

## エグゼクティブサマリー

本家 Minecraft Java Edition (1.18+) は **client-server authoritative なアーキテクチャ**を核に、以下で構成される:

1. **Voxel/描画**: パレット圧縮された 16×16×16 セクション群でチャンク（16×384×16, Y=-64〜320）を構成し、NBT/Anvil 形式で永続化。描画は face culling + greedy meshing、Sodium 的な region バッチ + 多段カリング。
2. **ワールド生成**: density function（ノイズルーター）+ Perlin ベース 3D 密度ノイズによる手続き地形 + 6 気候パラメータによるバイオーム決定 + cheese/spaghetti/noodle ノイズ洞窟 + アクイファー。
3. **ゲームプレイ**: JSON blockstate/model による描画、priority-based goal selector（旧）/ Brain system（新）による Mob AI。
4. **深層システム**: flood-fill 光伝播（Starlight 最適化）、サーバー権威の TCP パケット同期（シングルプレイでも内部サーバーが動く）。

**子供向けクリエイティブ寄りという最終ゴールを踏まえた線引き**:

| | 領域 |
|---|---|
| **忠実コア（必須）** | チャンク/セクション + パレット格納、greedy meshing + face culling 描画、block light / sky light の BFS 伝播、ブロック設置/破壊 |
| **後回し・簡略化可能** | 地形 density function 群（少数の手書きノイズで代替）、サバイバル系（空腹/戦闘/レシピ/Mob AI）、レッドストーン、アクイファー、netcode/マルチプレイ、無限ワールドストリーミング |

---

## 1. Voxel エンジンと描画

### 1.1 チャンク / セクション構造とブロックデータ格納 ✅ high (3-0)

- チャンクは **16×384×16（Overworld, Y=-64〜320）**、Nether/End は 16×256×16 をカバーし、垂直に **16×16×16 セクション**へ分割される。
- 1.18 以降は最下層セクション位置が**負値**を取る（例 `yPos=-4` → ブロック Y=-64。-4 × 16 = -64 と算術整合）。
- 各セクションのブロックは **パレット圧縮**で格納:
  - **パレット** = セクション内の異なる block state の集合（最大 4096 エントリ）
  - **64bit 整数配列にパックされた 4096 個のインデックス**（bits-per-entry は最小 4bit。セクションが単一 block state のときは data 配列を省略）

> 出典: [minecraft.wiki/Chunk_format](https://minecraft.wiki/w/Chunk_format)（verbatim 確認）, [World_boundary](https://minecraft.wiki/w/World_boundary), [Chunk](https://minecraft.wiki/w/Chunk)
>
> **Web 実装への示唆**: このパレット圧縮は**メモリ最小化の直接の参照モデル**。JS では `Uint16Array`（palette index）+ `palette: number[]` の組み合わせで素直に移植できる。子供向けでブロック種が少なければ palette は数十エントリで足り、index は 1 バイトに収まる。

### 1.2 セーブ形式（NBT / Anvil） ✅ high (3-0)

- チャンクは **NBT タグ**として領域単位の **Anvil ファイル（`r.x.z.mca`）**に格納される。これがモダンな拡張 Overworld 高さ（384 ブロック）を含むセーブ形式の実体。

> 出典: [minecraft.wiki/Chunk_format](https://minecraft.wiki/w/Chunk_format), [Region_file_format](https://minecraft.wiki/w/Region_file_format)
>
> **Web 実装への示唆**: 永続化は **IndexedDB** 等へ置換が必要だが、「region 単位でチャンクをシリアライズ」という概念は移植可能。**子供向けクリエイティブでは無限ストリーミングより固定/小規模ワールドで簡略化可能**。

### 1.3 ブロックモデル / blockstate（データ駆動描画） ✅ high (3-0)

- blockstate 定義は resource pack 内 `assets/<namespace>/blockstates` の JSON で、block の state-property 組み合わせを描画モデルへマップ。
- **相互排他な 2 システム**:
  - **`variants`** — 全 variant を列挙し各々をモデルへリンク
  - **`multipart`** — block state 属性に基づき複数モデルを条件付きで重畳（例: フェンスは 1.8 の 16-variant → 1.9 の 5 条件 multipart へ移行）

> 出典: [minecraft.wiki/Blockstates_definition](https://minecraft.wiki/w/Blockstates_definition), [NeoForged docs](https://docs.neoforged.net/docs/resources/client/models), [Fabric docs](https://docs.fabricmc.net/develop/blocks/blockstates)
>
> **Web 実装への示唆**: JSON model/blockstate + テクスチャアトラスは忠実に再現可能。ただし**子供向けで限定ブロックセットなら `variants` のみで足り、`multipart` は後回し可能**。

### 1.4 メッシュ化（face culling + greedy meshing） ✅ high (3-0)

- **face culling**: 隣接ブロックに隠れる面は生成しない（描画の基礎）。
- **greedy meshing**: 同一テクスチャの隣接面を 1 つの大きな四角形に統合。
- **binary greedy meshing**: voxel 占有を **64×64 の 64bit 整数配列**（0=air, 1=不透明）で表現し、ビット演算で **64 面を同時に cull/merge**。v1 より数倍高速（Ryzen 3800x で **チャンク当たり約 74us**/single-thread, 108us/threaded）。
  - ⚠️ **重要なトレードオフ**: v2 は **baked ambient occlusion を削除**（v1 ブランチは AO 保持）。AO を望むなら v1 相当の手法が必要。

> 出典: [cgerikj/binary-greedy-meshing](https://github.com/cgerikj/binary-greedy-meshing)（verbatim）, [0fps.net meshing part 1](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/) / [part 2](https://0fps.net/2012/07/07/meshing-minecraft-part-2/)
>
> **Web 実装への示唆**: face culling + greedy meshing は**忠実コア**。Three.js では `BufferGeometry` に頂点/法線/UV を直接書き込む。メッシュ生成は重いので Web Worker へオフロード検討。

### 1.5 描画アーキテクチャの参照モデル（Sodium） ✅ high (3-0)

Minecraft の vanilla レンダラを置換する高性能エンジン Sodium が示す指針:

- **(a) region バッチ**: chunk section を **RenderRegion（8×4×8 = 256 セクション）**へまとめて region 単位でバッチ描画。
- **(b) draw call 削減**: `glMultiDrawElementsBaseVertex` で複数チャンクジオメトリを 1 コールに集約。
- **(c) 多段カリング**: グラフベースオクルージョンカリング + フラスタムカリング + フォグオクルージョン + カメラ可視面のみの per-face culling を組み合わせ。

> 出典: [Sodium ソースコード](https://github.com/CaffeineMC/sodium)（RenderRegion.java で REGION_SIZE=256 等を verbatim 検証）, [DeepWiki chunk rendering pipeline](https://deepwiki.com/CaffeineMC/sodium/3.1-chunk-rendering-pipeline)
> ⚠️ 最新 dev（0.9.0/MC26.x）は multiDrawIndexed 抽象 + Vulkan バックエンドへリファクタ済。
>
> **Web 実装への示唆**: **フラスタム/オクルージョン/face culling は必須コア**。region 単位バッチが draw call 削減の指針。Three.js では複数チャンクの BufferGeometry マージや、可視チャンクのフラスタムカリングが効く。

---

## 2. ワールド生成（手続き生成）

### 2.1 モダン地形生成の中核（noise router + density function） ✅ high (3-0)

- 1.18+ のワールド生成は **noise router** = density function（各ブロック位置から数値を計算する数式）の集合体で、**地形生成・バイオームレイアウト・aquifer・ore vein** を駆動。
- density function は `data/<namespace>/worldgen/density_function`（単数形）の JSON としてデータパックに格納され、noise settings 内の noise router から参照される。
- 地形の固/空は **`final_density` 関数**で決まる: **正値 = (surface rule が後で置換しうる) default solid ブロック / 非正値 = aquifer/fluid が生成しうる air**。

> 出典: [minecraft.wiki/Noise_router](https://minecraft.wiki/w/Noise_router), [Density_function](https://minecraft.wiki/w/Density_function), [Noise_settings](https://minecraft.wiki/w/Noise_settings), [Henrik Kniberg "Reinventing Minecraft world generation"（Mojang 開発者一次講演）](https://www.youtube.com/watch?v=ob3VwY4JyzE)
>
> **Web 実装への示唆**: この data-driven density function 群は**簡略化可能なレイヤー**。子供向けクリエイティブなら**少数の手書きノイズ関数で代替**するのが現実的。

### 2.2 地形形状の基礎メカニズム（3D Perlin 密度ノイズ） ✅ high (3-0)

- オーバーハングや 3D 形状は **3D Perlin 勾配ノイズ**が生む per-block の **density** 値で駆動: **density > 0 で固体ブロック、それ以外で air**。
- 周波数/振幅の異なる **octave を加算**して自然な結果を得る（厳密には "improved Perlin" を 2 つ平均）。

> 出典: [minecraft.wiki/World_generation](https://minecraft.wiki/w/World_generation)
>
> **Web 実装への示唆**: 忠実コアはこの**「density > 0 = solid」のシンプルな基礎**。`simplex-noise` 等の JS ライブラリで octave 加算するだけで「らしい」地形が出る。spline/router 層は後回し可能。

### 2.3 バイオーム決定（6 気候パラメータ） ✅ high (3-0)

- 1.18+ の Overworld バイオームは **6 パラメータ**で決まる: **temperature / humidity(=vegetation) / continentalness(=continents) / erosion / weirdness(=ridges) / depth**。
- **depth** だけは純粋なノイズではなく**地形高さを追跡**し、主に地表/洞窟バイオームを区別する。

> 出典: [minecraft.wiki/World_generation](https://minecraft.wiki/w/World_generation)（verbatim）
> ⚠️ 「気候パラメータは地形形状に影響せずバイオーム配置のみ駆動」とする補足主張は検証で **1-2 棄却**（§5 参照）。climate parameter と地形 shape の境界は完全には確定していない。
>
> **Web 実装への示唆**: 子供向けでは 2 パラメータ（temperature × humidity）程度のグリッドで「草原/砂漠/雪原」を出すだけでも十分に Minecraft らしい。

### 2.4 洞窟生成と aquifer（流体決定） ✅ high (3-0)

- 洞窟は **3 種のノイズ洞窟**:
  - **cheese** = ポケット状（大空洞）
  - **spaghetti** = 細長
  - **noodle** = より細く曲がりくねった 1〜5 ブロック幅
- **aquifer** は空き領域の流体を決定。aquifer が無ければ**海面〜Y=-54 の空き領域はすべて水**、**Y=-55 以下は常に溶岩**。

> 出典: [minecraft.wiki/World_generation](https://minecraft.wiki/w/World_generation)（verbatim）, [PCGamesN](https://www.pcgamesn.com/minecraft)
>
> **Web 実装への示唆**: 洞窟 noise・aquifer は**後回し/簡略化可能**。ただしノイズ洞窟は地形の魅力に寄与するため、**簡易 cheese cave 程度**（3D ノイズで threshold を切るだけ）は検討余地あり。

---

## 3. ゲームプレイとサバイバル

### 3.1 Mob AI（優先度ベース goal selector） ✅ high (3-0)

- 旧 Mob AI は**優先度ベースの goal selector**: 各 tick で mob は実行可能な**最小優先度番号**の goal を試み、機会があればより低い優先度番号の goal に切り替える（例: 優先度 3 で villager を追う zombie が、プレイヤーが検知範囲に入ると優先度 2 へ切り替え）。
- goal は同一 control（movement/look/target）を競合。これはレガシーで、villager 等は **1.14 以降の新 Brain/Behavior システム**を使う。

> 出典: [minecraft.wiki/Mob_AI](https://minecraft.wiki/w/Mob_AI), Fabric Yarn GoalSelector Javadoc
>
> **Web 実装への示唆**: 子供向けクリエイティブモード寄りでは **Mob AI/pathfinding 自体が後回し可能**なサバイバル領域。

> ℹ️ **未検証（caveat）**: tick システム(20 TPS) の処理順序、クラフトレシピ、空腹/体力、昼夜サイクルの内部実装は、ソース取得はしたが今回の 3 票検証対象には含まれていない（§6 未カバー領域）。

---

## 4. 深層システム

### 4.1 ライティングエンジンと Starlight 最適化 ✅ high (3-0)

- **vanilla light engine**: 更新ブロックごとに **6 近傍すべてを確認する pull 型**。
- **Starlight**: 外向きに伝播し**伝播元の 1 近傍のみを確認する push 型**で冗長読み取りを排除（`getLightLevel` 呼出が **171,739 → 24,535 へ約 7 倍削減**）。
- さらに Starlight は chunk section に格納した **bitset で「opacity 0 が保証されるブロック」をマーク**し、sky light 源設定時の top-down 走査を回避。

> 出典: [PaperMC/Starlight TECHNICAL_DETAILS.md](https://github.com/PaperMC/Starlight/blob/fabric/TECHNICAL_DETAILS.md)（エンジン作者 Spottedleaf の一次技術文書）, [minecraft.wiki/Light](https://minecraft.wiki/w/Light)
>
> **Web 実装への示唆**: block light / sky light の **flood-fill/BFS 伝播は忠実コア**。Starlight の push 型 1 近傍 + opacity-0 ビットセットが直接の最適化参照。JS では BFS キュー（`Uint8Array` の光レベル格納）で素直に実装できる。

### 4.2 ネットワーク / netcode（サーバー権威モデル） ✅ high (3-0)

- Java Edition プロトコルは **TCP client-server モデル**。サーバーがプレイヤー位置・移動に**権威**を持つ。
- **5 つの接続状態**: Handshaking（初期）→ Status / Login → Configuration → Play（Handshake / Login Success 等のパケットで遷移）。
- 同期の具体: ランダム ID の keep-alive をクライアントがエコー返答必須、**Synchronize Player Position で位置を強制**し、ID が一致する **Confirm Teleportation** 受信まで移動パケットを無視。
- **シングルプレイでも内部サーバーが動く**この client-server authoritative モデルが本質。

> 出典: [Java Edition protocol (旧 wiki.vg)](https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Protocol), [Packets](https://minecraft.wiki/w/Java_Edition_protocol/Packets)（protocol version 773 = 1.21.10）
>
> **Web 実装への示唆**: netcode/マルチプレイは**後回し可能**。ただしローカルでも「ワールド状態の権威ソース（store）↔ 描画/入力」を分離した**内部権威モデルを意識した状態管理**にしておくと、後のマルチプレイ拡張に効く。現在の `zustand` ストア設計と整合する。

---

## 5. 棄却された主張（敵対的検証で却下）

| 主張 | 投票 | 備考 |
|---|---|---|
| 「気候 6 パラメータは地形形状に影響せず、地形形状は `final_density` のみで決まる。6 フィールドはバイオーム配置を駆動（erosion/depth は aquifer にも寄与）」 | **1-2 棄却** | climate parameter と地形 shape の因果は曖昧さが残る |
| 「noise router は density function から distinct slot を埋める（final_density / 5 気候パラメータ / vein_toggle・vein_ridged・vein_gap）」 | **0-3 棄却** | slot 構成の細部は確証得られず |

> → §2.3 で「6 パラメータがバイオームを決める」ことは確定だが、**それらが地形形状に効くか否かの境界は未確定**。クローン実装では深追い不要。

---

## 6. このプロジェクト（kids-obby / Web 子供向けクリエイティブ）への示唆

### 6.1 忠実コア vs 後回しの最終線引き

**忠実に再現すべきコア（クローンの心臓部）**:
1. **チャンク/セクション + パレット格納**（§1.1） — メモリと拡張性の土台
2. **greedy meshing + face culling 描画**（§1.4） — 60fps の前提
3. **block light / sky light の BFS 伝播**（§4.1） — 「マイクラらしい」見た目の核
4. **ブロック設置/破壊**（クリエイティブの本質的遊び）

**後回し・簡略化可能**:
- 地形 density function 群 → 少数の手書きノイズ（§2.1, §2.2）
- サバイバル系（空腹/戦闘/レシピ/Mob AI）（§3） — 子供向け方針と一致
- レッドストーン、aquifer、netcode/マルチプレイ（§2.4, §4.2）
- 無限ワールドストリーミング → 固定/小規模ワールド（§1.2）

### 6.2 ブラウザ / JS / WASM 環境での実装上の注意点

- **react-three/rapier はスタックに直接合致** ✅（pmndrs の正規・活発メンテバインディング）。ただし⚠️ **固定 voxel グリッドとの相性上、Rapier の汎用 collider でブロック衝突を取ると専用 voxel 衝突より重くなりうる**。プレイヤー移動は **専用の voxel AABB 衝突**（チャンク配列を直接引く）に置換するのが定石。
- **メッシュ生成は Web Worker / WASM へオフロード**。その際 **チャンクデータ転送コスト（SharedArrayBuffer / transferable objects）**がボトルネックになりうる。
- **binary greedy meshing v2 は AO を削除**。AO（陰影で立体感を出す）を望むなら v1 相当の手法を選ぶ（§1.4）。
- 描画は **Sodium 的な「フラスタムカリング + 可視チャンクのみ描画 + region バッチ」**を意識（§1.5）。Three.js では BufferGeometry マージ / draw call 数の監視。
- 状態管理は **内部権威モデル**（ワールド状態の単一ソース ↔ 描画）を意識（§4.2）。既存の `zustand` 設計を拡張する形。

### 6.3 推奨する構築順序（依存性を考慮 — ここは順次必須）

> ⚠️ 以下は**依存関係で順次実行が必須**な領域。並列化で短縮できない（チャンク格納が無いと meshing できない、meshing が無いと lighting を載せられない）。

1. **チャンク/セクション + パレット格納**（データ構造の土台） →
2. **face culling + greedy meshing → Three.js 描画**（見えるようにする） →
3. **ブロック設置/破壊 + 該当チャンクのメッシュ再生成**（遊びの核） →
4. **block/sky light の BFS 伝播**（マイクラらしさ） →
5. **手書きノイズによる簡易地形生成**（世界を広げる）

→ ここまでが「子供向けクリエイティブ寄りクローン」の MVP。サバイバル/レッドストーン/マルチプレイは以降の独立フェーズ（並列化可）。

---

## 7. 未解決の問い（次の調査候補）

1. **tick システム（20 TPS）の内部処理順序** — block tick / random tick / entity tick / scheduled tick の実行順と tick lag 挙動（水流・レッドストーンの基盤）
2. **流体 flow とレッドストーン回路評価の具体アルゴリズム** — 20 TPS 固定 tick を Web/JS でどう実装し、設置/破壊イベントとどう統合するか
3. **Web/JS/WASM 固有の最大ボトルネック** — メッシュ生成オフロード時のチャンクデータ転送、Rapier voxel 衝突を専用ブロードフェーズに置換すべきか
4. **render distance / チャンク動的ロードアンロードとメッシュ再生成タイミング**を、固定小規模ワールドでどこまで省略してよいか

---

## 付録: ソース一覧

**一次ソース（primary）**:
- [minecraft.wiki/Chunk_format](https://minecraft.wiki/w/Chunk_format) — チャンク構造・パレット・Anvil/NBT
- [minecraft.wiki/Blockstates_definition](https://minecraft.wiki/w/Blockstates_definition) — blockstate/model JSON
- [PaperMC/Starlight TECHNICAL_DETAILS.md](https://github.com/PaperMC/Starlight/blob/fabric/TECHNICAL_DETAILS.md) — ライティング最適化
- [Java Edition protocol (wiki.vg merge)](https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Protocol) — netcode
- [pmndrs/react-three-rapier](https://github.com/pmndrs/react-three-rapier) — Web 物理スタック
- [cgerikj/binary-greedy-meshing](https://github.com/cgerikj/binary-greedy-meshing) — メッシュ化最適化
- [Henrik Kniberg "Reinventing Minecraft world generation"](https://www.youtube.com/watch?v=ob3VwY4JyzE) — Mojang 開発者講演

**二次/解説ソース（secondary/blog）**:
- [minecraft.wiki/World_generation](https://minecraft.wiki/w/World_generation), [Noise_router](https://minecraft.wiki/w/Noise_router), [Density_function](https://minecraft.wiki/w/Density_function), [Noise_settings](https://minecraft.wiki/w/Noise_settings)
- [minecraft.wiki/Mob_AI](https://minecraft.wiki/w/Mob_AI), [Tick](https://minecraft.wiki/w/Tick), [Light](https://minecraft.wiki/w/Light), [Region_file_format](https://minecraft.wiki/w/Region_file_format), [Redstone_mechanics](https://minecraft.wiki/w/Redstone_mechanics), [Fluid](https://minecraft.wiki/w/Fluid)
- [DeepWiki: Sodium chunk rendering pipeline](https://deepwiki.com/CaffeineMC/sodium/3.1-chunk-rendering-pipeline), [CaffeineMC/sodium](https://github.com/CaffeineMC/sodium)
- [0fps.net: Meshing in a Minecraft game](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/) / [part 2](https://0fps.net/2012/07/07/meshing-minecraft-part-2/)
- [Six months of voxel.js](https://medium.com/@deathcap1/six-months-of-voxel-js-494be64dd1cc), [Bomberbot: Minecraft clone with React & Three.js](https://www.bomberbot.com/react/code-a-minecraft-clone-using-react-and-three-js/)

**統計**: 5 アングル / 23 ソース取得 / 110 主張抽出 / 25 主張検証 / **23 確定・2 棄却** / 105 エージェント呼出
