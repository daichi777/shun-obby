# voxel コンソール警告ホワイトリスト（§3.3）

E2E テストハーネスは「リスト外の error/warn が1件でもあれば fail」とする。
ここに載るのは three/R3F/rapier 由来の無害な deprecation のみ。追加は必ず1件ずつ理由付きで。

| 正規表現 | 種別 | 理由 | 追加日 |
|---|---|---|---|
| `THREE\.Clock: .*deprecated.*Timer` | warning | R3F 内部が THREE.Clock を使用。機能影響なし（Three.js の将来移行案内）。 | 2026-06-18 |

> 判定方法: `browser_console_messages(level:'error')` が 0、かつ `level:'warning'` の各行が上表のいずれかに一致すること。
> 検証実績（2026-06-18 / seed 1337・8×8チャンク）: errors 0 / warnings 1（上記 THREE.Clock のみ）。
> S4ライティング追加後の再検証（2026-06-18 セッション#2）: errors 0 / warnings 1（同上）。
