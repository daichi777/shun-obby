import { RigidBody } from '@react-three/rapier'
import { Coin } from '../Coin'
import type { Vec3 } from '../level'

// ───────────────────────────────────────────────────────────────────
// スライド広場（増設）
// 右下の象限 x∈[30,88], z∈[30,88] に配置。既存 obby(x≈12〜27,z≈12〜24) の外側。
// 「登る階段 → 広い高台デッキ → 3本の滑り台（向き/高さちがい）→ 着地」。
// Roblox 配色（水色/赤/黄/白）。落ちても地面(y=0)に戻るだけ。
//
// ★レシピ厳守：
//   - 通常の足場/階段/着地：箱メッシュ＋ type="fixed" ＋ colliders="cuboid"。
//     friction は書かない（デフォルト）。
//   - 滑走面だけ friction を数値で指定（0.03）。傾きは 0.6rad 以上（slopeMaxAngle=0.5 より急）。
//   - 登り階段：1段の高さ ≤1.0m・奥行き ≥0.8m。
//   - RigidBody を scale した group は作らない。箱は合計 30 個以下。
// ───────────────────────────────────────────────────────────────────

// Roblox 風の原色パレット
const C = {
  blue: '#4cc9f0', // 水色（滑走面）
  red: '#ef4444', // 赤
  yellow: '#facc15', // 黄
  white: '#f8fafc', // 白
}

// 通常の足場・階段・着地（friction は指定しない＝デフォルト）。
function Block({ pos, size, color }: { pos: Vec3; size: Vec3; color: string }) {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={pos} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}

// ★滑走面（つるつる）。friction を「数値」で RigidBody に渡す＝安全。
// rotation は [x,y,z] のラジアン。傾き角は 0.6rad 以上にすること。
function SlideSurface({
  pos,
  size,
  rotation,
  color = C.blue,
}: {
  pos: Vec3
  size: Vec3
  rotation: Vec3
  color?: string
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" friction={0.03} position={pos} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}

// ──────────────────────────────────────────────
// レイアウト数値（すべて x∈[30,88], z∈[30,88] 内・フェンス±96 を侵さない）
// 登り口の根元あたりを (BX, BZ) として組む。
const BX = 46
const BZ = 44

// デッキ（高台）の天面高さ。3本のスライドはこのデッキ／中段から出る。
const DECK_TOP = 7.0 // 一番上のひろば天面

export function AreaSlidePark() {
  return (
    <>
      {/* ───────── 登り階段（1段1.0m・奥行き1.2m。z+方向へ登っていく）───────── */}
      {/* 天面: 1.0 / 2.0 / 3.0 / 4.0(=中段) / 5.0 / 6.0 / 7.0(=デッキ) */}
      <Block pos={[BX, 0.5, BZ + 0]} size={[5, 1, 1.4]} color={C.white} />
      <Block pos={[BX, 1.0, BZ + 1.2]} size={[5, 2, 1.4]} color={C.red} />
      <Block pos={[BX, 1.5, BZ + 2.4]} size={[5, 3, 1.4]} color={C.yellow} />
      {/* 中段デッキ（広め・ここから直線スライダーが1本出る） */}
      <Block pos={[BX, 2.0, BZ + 3.9]} size={[6, 4, 2.6]} color={C.white} />
      <Block pos={[BX, 2.5, BZ + 5.6]} size={[5, 5, 1.4]} color={C.red} />
      <Block pos={[BX, 3.0, BZ + 6.8]} size={[5, 6, 1.4]} color={C.yellow} />
      {/* 上のひろば（広いデッキ・ここから2本のスライドが左右へ出る） */}
      <Block pos={[BX, DECK_TOP - 0.5, BZ + 8.6]} size={[8, DECK_TOP, 4]} color={C.white} />

      {/* ───────── スライド1：デッキ → -x 方向へ直線（急）───────── */}
      {/* 上端はデッキ西端(天面7.0)に接続、下端は着地パッドへ。Z軸回転で +x が下がる向きを反転して -x が下がるよう +0.7rad。 */}
      {/* 滑走面：長さ10・厚み0.5・幅3。中心(34, 4.0, BZ+8.6)、約0.70rad(≈40度)。 */}
      <SlideSurface
        pos={[BX - 7, 4.0, BZ + 8.6]}
        size={[10, 0.5, 3]}
        rotation={[0, 0, 0.7]}
        color={C.blue}
      />
      {/* 着地パッド1（西側・地面ちょい上） */}
      <Block pos={[BX - 12, 0.4, BZ + 8.6]} size={[5, 0.8, 5]} color={C.yellow} />

      {/* ───────── スライド2：デッキ → +x 方向へ直線（急・逆向き）───────── */}
      {/* 既存 SLIDE と同じく -0.62〜-0.7rad（+x 端が下がる）。 */}
      <SlideSurface
        pos={[BX + 7, 4.2, BZ + 8.6]}
        size={[10, 0.5, 3]}
        rotation={[0, 0, -0.68]}
        color={C.blue}
      />
      {/* 着地パッド2（東側） */}
      <Block pos={[BX + 12, 0.4, BZ + 8.6]} size={[5, 0.8, 5]} color={C.red} />

      {/* ───────── スライド3：中段デッキ → +z 方向へ（X軸回転で奥へ下る・別の向き）───────── */}
      {/* 中段天面 4.0 から出発。X軸回転 +0.72rad で z+ が下がる。下端は奥(+z)の着地へ。 */}
      <SlideSurface
        pos={[BX, 2.3, BZ + 11]}
        size={[3, 0.5, 9]}
        rotation={[0.72, 0, 0]}
        color={C.blue}
      />
      {/* 着地パッド3（奥側 +z） */}
      <Block pos={[BX, 0.4, BZ + 16]} size={[5, 0.8, 5]} color={C.white} />

      {/* ───────── コイン（10枚）：階段ぞい → 各滑走面の途中 → 着地点 ───────── */}
      {/* 階段ぞい（登りながら） */}
      <Coin position={[BX, 1.8, BZ + 0]} />
      <Coin position={[BX, 3.3, BZ + 2.4]} />
      <Coin position={[BX, 4.3, BZ + 3.9]} />
      <Coin position={[BX, 6.3, BZ + 6.8]} />
      <Coin position={[BX, 8.3, BZ + 8.6]} />
      {/* 各スライドの途中（滑走面の中ほど・少し上） */}
      <Coin position={[BX - 7, 4.8, BZ + 8.6]} />
      <Coin position={[BX + 7, 5.0, BZ + 8.6]} />
      <Coin position={[BX, 3.1, BZ + 11]} />
      {/* 着地点（パッドの上） */}
      <Coin position={[BX - 12, 1.6, BZ + 8.6]} />
      <Coin position={[BX, 1.6, BZ + 16]} />
    </>
  )
}
