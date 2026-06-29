# Roblox 技術・デザイン調査レポート（方向性判断用）

> deep-research 実行結果（2026-06-16）。6アングル・26ソース・121主張抽出 → 25主張を3票敵対的検証 → **24確認 / 1棄却**。
> 目的: 息子さん（5歳・Roblox動画に夢中、「コイン集め」「大きいスライダー」「自分で作れる」が好き）向けに、Roblox風ゲームを作るか／何が必要かを見極める。
> 重点: ①人気ジャンルと仕組みの再現 ②5歳が夢中になる設計原則 ③Roblox本体の技術構成。

---

## 0. 結論（先に要点）

- **Roblox は「ゲーム」ではなく、ユーザーが作って公開して遊ぶ UGC ゲーム制作プラットフォーム**（Roblox Studio + Luau）。Minecraft（自由な探索・建築サンドボックス）とは本質が違う。
- 息子さんの「コイン集め」「大きいスライダー（滑り台）」は、Roblox の **obby（障害物コース）＋コレクト系**の定番で、**作り方が確立**している。
- **自分たちの Web スタックでも作れる**: react-three-fiber + react-three-rapier + **ecctrl**（MITのキャラクターコントローラ）で、コイン取得・チェックポイント・滑り台移動を**自前実装せずに**実現できる。
- ただし自作はトレードオフ: Roblox標準の**マルチプレイ・UGC経済圏・課金・モデレーション**を失う。
- **重要な判断軸**: 息子が欲しいのが「Robloxでよく見るゲーム」なら **Roblox Studio で直接作る**のが最短・高レバレッジ。「自分（パパと息子）だけのオリジナルゲーム」が狙いなら **Web自作**。→ §7で3択提示。

---

## ① 人気ジャンルと仕組みの再現

### Roblox の正体 〔信頼度: 高 / 3-0〕
- ユーザーが Roblox Studio でゲームを設計・アップロード・マルチプレイで遊ぶ**ゲーム制作サイト**。約2,000万本のユーザー公開ゲーム。
- 5歳にとって: Roblox＝**目標のある一口サイズのゲームのカタログ**（コイン/obby/滑り台）、Minecraft＝自分で方向を決める自由建築。
- 出典: [Common Sense Media](https://www.commonsensemedia.org/articles/minecraft-vs-roblox-how-these-games-stack-up-for-kids) / [Wikipedia: Luau](https://en.wikipedia.org/wiki/Luau_(programming_language))

### obby（障害物コース）の定番＝息子の「大きいスライダー」 〔信頼度: 高 / 3-0〕
- **Tower of Hell** が代表: チェックポイントなしで、**ハンドメイドのセクション群をランダムな順序で組み立てた**タワーを8分の制限時間内に登る。
- 「procedurally generated（手続き生成）」は正確には**セクションのプールをランダムに並べ替える**方式（真の手続き地形ではない）→ Web再現時もこの方式が現実的。
- 出典: [Tower of Hell wiki](https://roblox.fandom.com/wiki/YXceptional_Studios/Tower_of_Hell)
- **息子の「大きいスライダー」**＝坂・滑り台のセクション。物理で滑り降りる体験は obby の1パーツとして作れる。

### コイン取得・進行・通貨の仕組み（Luau定石）〔信頼度: 高 / 3-0〕
- **simulator のコアループ**: `Action（簡単な反復）→ Currency（報酬）→ Upgrade（通貨を使って効率UP）→ Repeat`。
- プレイヤーの通貨など可視ステータスは、**`leaderstats` という名前ちょうどのフォルダ**を作るとRobloxが自動でリーダーボードUIを生成（IntValue等）。
- コイン取得は **Touched イベント**（プレイヤーが触れたら通貨+1、コインを消す）。クライアントが触れたことをサーバーに伝え、更新後の通貨を配信。
- パート生成の定石: `Instance.new('Part')` → サイズ/色/位置を設定 → **`.Parent` を最後に**設定（複製を1回に）。
- 出典: [Simulator core loop](https://roblox.fandom.com/wiki/Simulator) / [leaderstats公式](https://create.roblox.com/docs/players/leaderboards) / [core-loops公式](https://create.roblox.com/docs/production/game-design/core-loops) / [RemoteEvents公式](https://create.roblox.com/docs/scripting/events/remote)

---

## ② 5歳が夢中になる設計原則

### 「ジューシーな」フィードバックが鍵 〔信頼度: 高 / 3-0〕
- **Juiciness ＝ 誇張された冗長な音・映像フィードバック**。ボタンが**潰れる/膨らむ/色が変わる** + **クリック/ポンッ音**で行動を強化し、子供の自信を育てる。
- 統制実験（n=61）で**ジューシーな音がプレゼンス（没入・感覚的忠実度）を統計的有意に高める**（中程度の効果量）。
- 子供UXガイド: ボタンは**即座に**反応すべき。
- 出典: [Inria/Eindhoven juicy音研究](https://inria.hal.science/hal-04144377/document) / [子供UX設計](https://gapsystudio.com/blog/ux-design-for-kids/)
- ⚠️ **注意（caveat）**: この実験は**大人が対象**。原則は一般に妥当だが「5歳に効く」は推論。過剰なjuiceは逆効果（圧倒・内発的動機の低下）。

### 収集・進行・報酬ループ
- collectible（収集）の心理、達成感、レベルアップ感、報酬ループ（宝箱/通貨）、作る楽しさ（UGC・自己表現）、友達と遊ぶソーシャル性が夢中の源泉。
- ⚠️ **安全・課金の注意**: 幼児向けは**チャットなし・UGC共有なし・課金なし**が最小安全ライン。Robloxの依存性・課金設計は親の懸念点でもある。

---

## ③ Roblox 本体の技術構成

| 要素 | 内容 | 信頼度 |
|---|---|---|
| **Luau** | Robloxが作ったLua 5.1派生のOSS（MIT）。漸進的型付け・高速・サンドボックス化。型注釈は任意。 | 高/3-0 |
| **物理 (PGS)** | 2015年導入の **Projected Gauss-Seidel** 反復ソルバ。反復回数で精度が上がる。2018年にハイブリッドLDL-PGS追加。 | 高/3-0 |
| **通信** | **RemoteEvents**（一方向・非同期: FireServer/FireClient/FireAllClients）と **RemoteFunctions**（双方向・応答待ち）。ReplicatedStorage等に置く。 | 高/3-0 |
| **永続化** | **DataStoreService**: セッション跨ぎ保存。experience単位で一貫（別サーバーからも同一データ）。**サーバー専用**（LocalScriptからはエラー）。 | 高/3-0 |
| **サーバー権威** | サーバーが唯一の真実、クライアントは入力のみ報告→チート防止。 | **中/2-1** |

⚠️ **重要なcaveat（サーバー権威）**: 「サーバー権威」は**オプトインのBETA機能**（2025-2026時点でライブ公開不可）。**既定モードではクライアントが自キャラ・近傍パーツのネットワーク所有権を持ち**、位置やTouchedをサーバーが受け入れる。「既定でサーバー権威」は誇張。

---

## ④ Roblox vs Minecraft（5歳向け判断材料）

| 観点 | Roblox | Minecraft |
|---|---|---|
| 本質 | **UGCゲーム制作＋遊ぶプラットフォーム** | 自由な探索・建築サンドボックス |
| 5歳の遊び方 | 目標つき一口ゲーム（コイン/obby/滑り台） | 自分で目標を決める自由建築 |
| 作る言語 | Luau | （MOD/データパック等） |
| マルチ・経済・安全 | 標準装備（チャット・課金・モデレーション） | 比較的シンプル |
| 息子の現状 | **動画に夢中・「作れる」に興味** | 元々の興味 |

> ⚠️ 「Common Sense Media が Roblox 13+ / Minecraft 8+ と評価」という主張は **棄却（1-2）** ＝出典を断定できず除外。年齢評価は判断根拠にしない。

---

## ⑤ Web（自分たち）で作る場合：現実的なOSS経路 〔信頼度: 高 / 3-0〕

**react-three-fiber + react-three-rapier + ecctrl** の3点セットで、obby/コイン集めの中核を**自前のコントローラを書かずに**実現できる:

- **ecctrl**（MIT, `npm install ecctrl`）: 物理駆動キャラコン。**ジャンプ/歩き/走り**、安定した接地、**段差・坂（滑り台）の処理**を内蔵 ← obby/滑り台にぴったり。
- **react-three-rapier**: Rapier（WASM物理）ラッパー。**`onCollisionEnter/Exit`** と **センサーコライダー（`onIntersectionEnter`）** ← **コイン取得・チェックポイント判定**の定番（RobloxのTouched相当）。
- 出典: [ecctrl](https://github.com/pmndrs/ecctrl) / [react-three-rapier](https://github.com/pmndrs/react-three-rapier)

⚠️ **重大なcaveat（スタック制約）**: この経路は **react-three-fiber（React 19）が前提**で、**素のThree.jsではない**。現在の `minecraft-clone` は素のThree.js+TS なので、**アーキテクチャ判断**が必要:
- (a) **R3F（React）に乗る** → OSSコントローラをそのまま使える（最短）。
- (b) **素のThree.jsで通す** → `three` + `@dimforge/rapier3d` を直接使い、コントローラは自前（自由だが工数増）。

自作は **マルチプレイ・永続化・安全（チャット/課金/モデレーション）が標準で付かない** → まず**シングルプレイ・チャットなし・課金なし**が現実的。

---

## ⑥ 注意点（caveats）まとめ

1. **サーバー権威はBETA**（ライブ不可）。「既定でサーバー権威」と誤解しない。
2. **juicy音の実験は大人対象**。5歳特異な効果は推論（child-UXは別ソース）。
3. **ecctrl/react-three-rapier は React前提**（素のThree.jsではない）。バージョンは速く動く（ecctrl 2.0.0 / R3R v2 / React 19）→ピン留め必須。
4. simulatorコアループ・juicy設計の一部は**ブログ品質**だが、各々**一次ソース**（Roblox公式core-loops / 査読済みjuicy研究）で裏付け。
5. **年齢評価の主張は棄却**（除外済み）。

## ⑦ 未解決の問い（要・追加検討）

- **マルチプレイ**: 自作WebならどんなRTバックエンド（Colyseus / Supabase Realtime / WebSocket）と権威モデルが要るか。5歳の初版はシングルプレイで十分か。
- **安全・課金・COPPA**: 自作の最小安全ライン（チャットなし/共有なし/課金なし）。
- **4-6歳特異のリテンション根拠**: 検証済み原則は大人/一般対象。幼児で過剰・搾取的にならない線引き。
- **作る vs プラットフォーム**: obby+コインの最小スライスをマルチ/永続化/安全込みで自作する労力 vs **Roblox Studio で直接公開**（息子が既に欲しがっており、全部品が native）。**後者が高レバレッジな可能性**。

---

## ⑧ 方向性の3択（§7の判断 → 次アクション）

- **[A] Roblox Studio で直接作る（最短・息子の現状に最も合致）**
  息子が見ているのがまさにRoblox。コイン/obby/滑り台は公式チュートリアルレベル。マルチ・保存・安全が標準装備。
  代償: 「自分たちのコードベース」ではない／Luau学習／Robloxアカウント・年齢の考慮。
- **[B] Web で Roblox風オリジナルを自作（パパと息子だけのゲーム）**
  R3F + Rapier + ecctrl で obby+コインのシングルプレイから。完全に自分たちの作品。
  代償: Reactスタック採用の判断／マルチ・安全は自前／工数。
- **[C] 両にらみ**: まず Roblox Studio で息子と一緒に小さなobbyを作って「作る楽しさ」を体験 → 並行して Web自作を技術的に進める。

> minecraft-clone は当面そのまま保持。本調査は方向決定のための材料。
